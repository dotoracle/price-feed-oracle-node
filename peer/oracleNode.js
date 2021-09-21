/* eslint-disable no-console */
'use strict'

const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const Mplex = require('libp2p-mplex')
const { NOISE } = require('libp2p-noise')
const Gossipsub = require('libp2p-gossipsub')
const Bootstrap = require('libp2p-bootstrap')
const config = require('config')
const PubsubPeerDiscovery = require('libp2p-pubsub-peer-discovery')
const relayMultiaddrs = config.get("peerBootstrap")
const Signer = require('../oracles/signPriceData')
const priceFeed = require('../jobs/pricefeed')

const peerService = require('./peer')
const logger = require("../helpers/logger")
const protocols = '/pricefeed'
const MPC = require('../mpc/g18_mpc_ecdsa')
const keccak256 = require('keccak256')
const cleanUp = require('./cleanupgg18')

let metadata = {
    chainId: 97,
    contractAddress: "0x4e79A2f145728504CBbf53710d0d24c7a176aBd9"
}

const createNode = async (bootstrapers) => {
    const node = await Libp2p.create({
        addresses: {
            listen: ['/ip4/0.0.0.0/tcp/0']
        },
        modules: {
            transport: [TCP],
            streamMuxer: [Mplex],
            connEncryption: [NOISE],
            pubsub: Gossipsub,
            peerDiscovery: [Bootstrap, PubsubPeerDiscovery]
        },
        config: {
            peerDiscovery: {
                [PubsubPeerDiscovery.tag]: {
                    interval: 1000,
                    enabled: true
                },
                [Bootstrap.tag]: {
                    enabled: true,
                    list: bootstrapers
                }
            }
        }
    })

    return node
}

async function startOracleNode() {

    const [node] = await Promise.all([
        createNode(relayMultiaddrs),
    ])

    let nm = peerService.createNodeManager(node)
    nm.approversMap = {}    //messageHash => approver

    await peerService.startPeerService(nm, protocols,
        async function (pros, receivedData) {
            let verified = await priceFeed.validateOracleData(receivedData, metadata, nm.priceFeedConfig)
            if (verified) {
                peerService.sendToAllPeers(nm, pros, receivedData)

                let signerData = Signer.recoverSigner(receivedData)
                if (!nm.approvedMessages[signerData.messageHash]) {
                    nm.approvedMessages[signerData.messageHash] = []
                }
                if (!nm.approvedMessages[signerData.messageHash].includes(signerData.address)) {
                    nm.approvedMessages[signerData.messageHash].push(signerData.address)
                    console.log('current num signer ', signerData.messageHash, nm.approvedMessages[signerData.messageHash].length)
                }

                //create signature for me
                let mySignature = Signer.signMessage(signerData.rawData)
                peerService.sendToAllPeers(nm, pros, mySignature.combined)

                if (!nm.approvedMessages[signerData.messageHash].includes(Signer.myOracleAddress())) {
                    nm.approvedMessages[signerData.messageHash].push(Signer.myOracleAddress())
                    console.log('current num signer ', signerData.messageHash, nm.approvedMessages[signerData.messageHash].length)
                }

                if (priceFeed.signersSufficient(metadata, nm.priceFeedConfig, nm.approvedMessages[signerData.messageHash].length)) {
                    logger.info('Consensus agreement, it is now time to make MPC signature')
                    if (nm.mpcState[signerData.messageHash]) {
                        logger.info('An instance of MPC is already running for this message')
                        return
                    }
                    nm.mpcState[signerData.messageHash] = true
                    let hashForMPC = Signer.getHashForMPCWithHash(signerData.messageHash)
                    let first4Bytes = hashForMPC.slice(0, 10)
                    let hashId = parseInt(first4Bytes)
                    let port = hashId % 10
                    let ip = config.sm_endpoint
                    let initialPort = parseInt(config.sm_initialport) 
                    let targetPort = initialPort + port
                    MPC.startMPCSign(`${ip}:${targetPort}`, "keys.store", hashForMPC.slice(2), async function (sig) {
                        let r = sig.r
                        let s = sig.s
                        let v = parseInt(sig.v) + 27
                        try {
                            let random = Math.floor(Math.random() * 10)
                            let waitTime = random * 5
                            logger.info("Waiting for %s second before submit", waitTime)
                            setTimeout(async() => {
                                logger.info('submitting signature %s', sig)
                                await priceFeed.submitTransaction(metadata, nm.priceFeedConfig, signerData.rawData, "0x" + r, "0x" + s, v)
                                //await ct.methods.submit(nextRound, prices, deadline, r, s, v).send({ from: account, gas: 2000000, gasPrice: 20000000000 })
                                logger.info('success')
                            }, waitTime * 1000)
                            
                        } catch (e) {
                            logger.error(e)
                        } finally {
                            cleanUp()
                        }
                    })
                }
            }
        }
    )

        ;[node].forEach((node, index) => logger.info(`Node ${index} starting with id: ${node.peerId.toB58String()}`))
    await Promise.all([
        node.start(),
    ])

    nm.multiaddrs = node.multiaddrs.map((ma) =>
        ma.toString() + '/p2p/' + node.peerId.toB58String()
    )
    //test data
    var i = 0
    setInterval(async function () {
        let data = await priceFeed.getLatestDataToSign(metadata, nm.priceFeedConfig)
        console.log(data.data)
        let now = Math.floor(Date.now() / 1000)
        let signed = Signer.signMessage(data.data)
        console.log('lastupdated', data.lastUpdated, now)
        let oracleAddresses = data.oracleAddresses.map(e => e.toLowerCase());
        let myOrackeAddress = Signer.myOracleAddress().toLowerCase()
        let myIndex = oracleAddresses.findIndex( e => e == myOrackeAddress)
        if (myIndex == -1) return;

        let pushInternal = 10 * 60;
        let turnTime = Math.floor(pushInternal/oracleAddresses.length)
        if (data.lastUpdated + 10*60 > now) return; 
        //is this my turn to push data? 
        if (data.lastUpdated + myIndex * turnTime <= now && now < data.lastUpdated + (myIndex + 1) * turnTime) {
            let message = signed.combined
            let hash = keccak256(message)
            nm.seenMessages[hash] = true
            await peerService.sendToAllPeers(nm, [protocols], message)
            i++;
        }
    }, 30)

}
startOracleNode()
