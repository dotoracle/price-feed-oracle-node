/* eslint-disable no-console */
'use strict'
const pipe = require('it-pipe')
const logger = require("../helpers/logger")
const keccak256 = require('keccak256')
const BAN_THRESHOLD = 3

function messageHash(m) {
  return keccak256(m)
}
function getValidPeerList(nm) {
  return Object.keys(nm.peerMap).filter(p => !isBanned(nm, p))
}
function isBanned(nm, peerId) {
  return nm.banScore[peerId] && nm.banScore[peerId] > BAN_THRESHOLD ? true:false;
}

async function sendToPeer(nm, peerId, protocols, message) {
  try {
    const { stream } = await nm.node.dialProtocol(peerId, protocols)
    logger.info('Sending to %s', peerId)
    await pipe(
      Array.isArray(message)? message : [message],
      stream
    )
    logger.info('success')
  } catch (e) {
    logger.error('Failed to broadcast to %s', peerId)
    //increase banscore
    let currentBanScore = nm.banScore[peerId] ? nm.banScore[peerId] : 0;
    nm.banScore[peerId] = currentBanScore + 1;
    logger.warn(`Peer ${peerId} bannedScore ${nm.banScore[peerId]}`)
    if (isBanned(nm, peerId)) {
      delete nm.banScore[peerId];
    }
  }
}

async function sendToPeers(nm, peerList, protocols, message) {
  let l = peerList.map(async peerId => {
    return await sendToPeer(nm, peerId, protocols, message)
  })
  Promise.all(l)
}

async function sendToAllPeers(nm, protocols, message) {
  sendToPeers(nm, getValidPeerList(nm), protocols, message)
}
async function startPeerService(nm, protocol) {
  nm.node.handle(protocol, ({ stream }) => {
    pipe(
      stream,
      async function (source) {
        //if (!nm.streams[stream]) nm.streams[stream] = true
        for await (const msg of source) {
          let msgString = msg.toString()

          //let msgHash = messageHash(msgString)
          if (!nm.seenMessages[msgString]) {
            logger.info(`receving ${msgString}`)
            nm.seenMessages[msgString] = true
            sendToAllPeers(nm, [protocol], msgString)
          }
        }
      }
    )
  })

  nm.node.handle('/peerbinding', ({ stream }) => {
    pipe(
      stream,
      async function (source) {
        for await (const pstr of source) {
          nm.peerMap[pstr] = true
        }
      }
    )
  })

  nm.node.connectionManager.on('peer:connect', async (connection) => {
    let pstr = connection.remoteAddr.toString()
    if (pstr.split(`/`).length == 5) {
      //remote does not contain peer id
      pstr = `${pstr}/${connection.remotePeer.toB58String()}`
    }
    logger.info('peer:connect Remote Peer %s', pstr)
    //pstr = pstr.slice(1, pstr.length - 1)
    //logger.info('Connection established to %s, peer %s', connection.remoteAddr, connection.remotePeer.toB58String())	// Emitted when a peer has been found
    nm.peerMap[pstr] = true
    //sending address to this peer
    sendToPeer(nm, pstr, ['/peerbinding'], nm.multiaddrs)
  })

  nm.node.on('peer:discovery', (peerId) => {
    logger.info(`Peer discovered: ${peerId.toB58String()}`)
  })
}

function createNodeManager(node) {
  return {
    node: node,
    seenMessages: {},
    peerMap: {},
    banScore: {},
    streams: {},
    multiaddrs: []
  }
}

module.exports = {
  sendToPeer,
  sendToPeers,
  startPeerService,
  sendToAllPeers,
  createNodeManager
}
