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

let metadata = {
    chainId: 97,
    contractAddress: "0x8ffE8F68833aF4D07a8fdEdB32F204a4201ba21D"
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
        logger.info('about to send %s', data)
        let signed = Signer.signMessage(data)
        let message = signed.combined
        nm.seenMessages[message] = true
        await peerService.sendToAllPeers(nm, [protocols], message)
        i++;
    }, 30000)

}
startOracleNode()
