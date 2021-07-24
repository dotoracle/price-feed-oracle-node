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

const peerService = require('./peer')
const logger = require("../helpers/logger")
const protocols = '/pricefeed'
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

    await peerService.startPeerService(nm, protocols)

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
        let message = "hello" + i + node.peerId.toB58String()
        await peerService.sendToAllPeers(nm, [protocols], message)
        i++;
    }, 10000)

}
startOracleNode()
