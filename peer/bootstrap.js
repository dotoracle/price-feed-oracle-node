/* eslint-disable no-console */
'use strict'

const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const Mplex = require('libp2p-mplex')
const { NOISE } = require('libp2p-noise')
const logger = require("../helpers/logger")

const createRelayServer = require('libp2p-relay-server')
const peerService = require('./peer')

  ; (async () => {
    const relay = await createRelayServer({
      listenAddresses: ['/ip4/0.0.0.0/tcp/0']
    })
    logger.info(`libp2p relay starting with id: ${relay.peerId.toB58String()}`)
    await relay.start()
    let nm = peerService.createNodeManager(relay)

    await peerService.startPeerService(nm, ['/pricefeed'])

    const relayMultiaddrs = relay.multiaddrs.map((m) => m.toString() + "/p2p/" + relay.peerId.toB58String())
    let s = "["
    relayMultiaddrs.forEach(e => {
      s = `${s}
      "${e}",`
    })
    s = `${s}
    ]`
    logger.info('relayMultiaddrs %s', s)
  })();
