
const Web3 = require('web3');
const web3 = new Web3();
const config = require('config')
const oracleKeys = config.get('oracles.keys')
const oracleAddresses = config.get('oracles.addresses')

module.exports = {
  signPriceData: function (roundId, priceFeedAddress, prices, deadline, tokenList, description) {
    const encoded = web3.eth.abi.encodeParameters(['uint32', 'address', 'int256[]', 'uint256', "string[]", "string"], [roundId, priceFeedAddress, prices, deadline, tokenList, description])
    let msgHash = web3.utils.sha3(encoded);
    let sigs = oracleKeys.map(k => web3.eth.accounts.sign(msgHash, k))
    return sigs
  },
  computeMessageHashForMPC: function (roundId, priceFeedAddress, prices, deadline, tokenList, description) {
    const encoded = web3.eth.abi.encodeParameters(['uint32', 'address', 'int256[]', 'uint256', "string[]", "string"], [roundId, priceFeedAddress, prices, deadline, tokenList, description])
    let msgHash = web3.utils.sha3(encoded);
    msgHash = web3.utils.soliditySha3("\x19Ethereum Signed Message:\n32", msgHash)
    return msgHash
  }
}
