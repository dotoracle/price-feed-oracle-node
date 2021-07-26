/* eslint-disable no-console */
'use strict'
const pipe = require('it-pipe')
const logger = require("../helpers/logger")
const keccak256 = require('keccak256')
const Signer = require('../oracles/signPriceData')
const BAN_THRESHOLD = 3
const config = require('config')
const oracleAddresses = config.get('oracles.addresses')
const priceFeed = require("../jobs/pricefeed")

function messageHash(m) {
  return keccak256(m)
}
function getValidPeerList(nm) {
  return Object.keys(nm.peerMap).filter(p => !isBanned(nm, p))
}
function isBanned(nm, peerId) {
  return nm.banScore[peerId] && nm.banScore[peerId] > BAN_THRESHOLD ? true : false;
}

function increaseBanScore(nm, peerId) {
  let currentBanScore = nm.banScore[peerId] ? nm.banScore[peerId] : 0;
  nm.banScore[peerId] = currentBanScore + 1;
  logger.warn(`Peer ${peerId} bannedScore ${nm.banScore[peerId]}`)
  if (isBanned(nm, peerId)) {
    delete nm.banScore[peerId];
  }
}

async function sendToPeer(nm, peerId, protocols, message) {
  try {
    const { stream } = await nm.node.dialProtocol(peerId, protocols)
    logger.info('Sending to %s', peerId)
    await pipe(
      Array.isArray(message) ? message : [message],
      stream
    )
    logger.info('success')
  } catch (e) {
    logger.error('Failed to broadcast to %s', peerId)
    //increase banscore
    increaseBanScore(nm, peerId)
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

function verifyMessage(msg) {
  let recoveredAddress = Signer.recoverSigner(msg)
  if (!recoveredAddress || !recoveredAddress.address) {
    logger.warn('Cannot verify received data')
    return null
  }
  let lowerCases = oracleAddresses.map(o => o.toLowerCase())
  return {result: lowerCases.includes(recoveredAddress.address.toLowerCase()), signer: recoveredAddress.address.toLowerCase(), messageHash: recoveredAddress.messageHash}
}

//source stream is created by web3.eth.abi.encodeParameters(['uint32', 'address', 'int256[]', 'uint256', "string[]", "string"], [roundId, priceFeedAddress, prices, deadline, tokenList, description])
async function startPeerService(nm, protocol, cb) {
  nm.node.handle(protocol, ({ stream }) => {
    pipe(
      stream,
      async function (source) {
        for await (const msg of source) {
          let msgString = msg.toString()
          //let msgHash = messageHash(msgString)
          if (!nm.seenMessages[msgString]) {
            let verifiedRet = verifyMessage(msgString)
            if (verifiedRet) {
              logger.info(`receving data from ${verifiedRet.signer}`)
              nm.seenMessages[msgString] = true
              if (!cb) {
                sendToAllPeers(nm, [protocol], msgString)
              } else {
                cb([protocol], msgString)
              }
            } else {
              logger.warn(`Unverified data ${msgString}`)
              //increase banscore
              //increaseBanScore(nm, )
            }
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

  nm.priceFeedConfig = await priceFeed.getConfigData()
}

function createNodeManager(node) {
  return {
    node: node,
    seenMessages: {},
    peerMap: {},
    banScore: {},
    streams: {},
    multiaddrs: [],
    approvedMessages: {}
  }
}

module.exports = {
  sendToPeer,
  sendToPeers,
  startPeerService,
  sendToAllPeers,
  createNodeManager
}
