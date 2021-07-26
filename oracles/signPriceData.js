
require('dotenv').config()
const Web3 = require('web3');
const web3 = new Web3();
const config = require('config')
const oracleKeys = config.get('oracles.keys')
const oracleAddresses = config.get('oracles.addresses')
var ethUtil = require('ethereumjs-util');
var pKey = process.env.ORACLE_PRIVATE_KEY
module.exports = {
  // signPriceData: function (roundId, priceFeedAddress, prices, deadline, tokenList, description) {
  //   const encoded = web3.eth.abi.encodeParameters(['uint32', 'address', 'int256[]', 'uint256', "string[]", "string"], [roundId, priceFeedAddress, prices, deadline, tokenList, description])
  //   let msgHash = web3.utils.sha3(encoded);
  //   let sigs = oracleKeys.map(k => web3.eth.accounts.sign(msgHash, k))
  //   return sigs
  // },
  recoverSigner: function (data) {
    //data include encoded price data and signature of oracle
    //signature is the last 65 bytes [r,s,v]
    if (data.slice(0, 2) != "0x") return 'failed';
    if (data.length < 2 + 65 * 2) return 'failed';
    let sig = data.slice(data.length - 65 * 2);
    let r = "0x" + sig.slice(0, 64);
    let s = "0x" + sig.slice(64, 128)
    let v = parseInt(sig.slice(128), 16)

    let encoded = data.slice(0, data.length - 65 * 2)
    let messageHash = web3.utils.sha3(encoded);
    var messageHashx = Buffer.from(messageHash.replace("0x", ""), "hex")

    // Signed Hash
    var recoveredPub = ethUtil.ecrecover(messageHashx, v, Buffer.from(r.replace("0x", ""), "hex"), Buffer.from(s.replace("0x", ""), "hex"))
    var recoveredAddress = ethUtil.pubToAddress(recoveredPub).toString("hex")
    return {address: "0x" + recoveredAddress.toLowerCase(), messageHash: messageHash}
  },
  signMessage: function (data) {
    let messageHash = web3.utils.sha3(data);
    var messageHashx = Buffer.from(messageHash.replace("0x", ""), "hex")

    var pKeyx = Buffer.from(pKey.replace("0x", ""), "hex")

    // Signed Hash
    var sig = ethUtil.ecsign(messageHashx, pKeyx)
    return {sig: sig, combined: `${data}${sig.r.toString('hex')}${sig.s.toString('hex')}${sig.v.toString('16')}`}
  },
  // computeMessageHashForMPC: function (roundId, priceFeedAddress, prices, deadline, tokenList, description) {
  //   const encoded = web3.eth.abi.encodeParameters(['uint32', 'address', 'int256[]', 'uint256', "string[]", "string"], [roundId, priceFeedAddress, prices, deadline, tokenList, description])
  //   let msgHash = web3.utils.sha3(encoded);
  //   msgHash = web3.utils.soliditySha3("\x19Ethereum Signed Message:\n32", msgHash)
  //   return msgHash
  // }
}

