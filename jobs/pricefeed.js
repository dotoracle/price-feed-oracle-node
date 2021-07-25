require('dotenv').config()
const config = require('config')
const Web3 = require('web3');
const staticWeb3 = new Web3()
const HDWalletProvider = require('@truffle/hdwallet-provider')
const exchangeHelper = require('../helpers/readPrice')
const multipricefeedConfig = config.get("contracts.multipricefeed")
const MultiPriceFeedABI = require('./abi/MultiPriceFeedOracle.json')

const db = require('../models')

const chainIdList = Object.keys(multipricefeedConfig)
const contractMap = {}  //contract list based on chain id
chainIdList.forEach(c => contractMap[c] = multipricefeedConfig[c])
const period = 8 * 60;  //8 mionutes

//data is read from data base and encode all parameters in hex
async function getLatestDataToSign(metadata, configData) {
    let tokens = configData.tokens
    let priceMap = {}
    for (let i = 0; i < tokens.length; i++) {
        let price = await db.TokenPrice.findOne({ token: tokens[i] })
        priceMap[tokens[i]] = price
    }
    let chainId = metadata.chainId
    let contractAddress = metadata.contractAddress  //oracle contract
    let idx = configData[chainId].contracts.findIndex(e => e.options.address.toLowerCase() == contractAddress.toLowerCase())
    let tokensToEncode = configData.tokens[idx]
    let priceOfTokensToEncode = tokensToEncode.map(t => priceMap[t])

    let ct = configData[chainId].contracts[idx]
    let latestRoundInfo = await ct.methods.latestRoundInfo().call()
    let description = configData[chainId].descriptions[idx]
    let currentRound = parseInt(latestRoundInfo.roundId)
    let nextRound = currentRound + 1
    let updatedAt = parseInt(latestRoundInfo.updatedAt)
    let now = Math.floor(Date.now() / 1000)
    updatedAt = now > updatedAt ? now : updatedAt
    let deadline = updatedAt + 200//valid til 200s

    let web3 = configData[chainId].web3
    const encoded = web3.eth.abi.encodeParameters(['uint32', 'address', 'int256[]', 'uint256', "string[]", "string"], [nextRound, contractAddress, priceOfTokensToEncode, deadline, tokensToEncode, description])
    return encoded
}

//validate data received from other oracles with the locally stpred data in DB
function validateOracleData(data, metadata, configData) {
    let decoded = staticWeb3.eth.abi.decodeParameters([
        {type: 'uint32', name: roundId},
        {type: 'address', name: contractAddress},
        {type: 'int256[]', name: prices},
        {type: 'uint256', name: deadline},
        {type: 'string[]', name: tokens},
        {type: 'string', name: description},
    ], data)

    //verify prices are not much different from data base
}

function getConfigData() {
    const priceFeedInfoMap = {}
    //reading price feed  contract info
    for (var i = 0; i < chainIdList.length; i++) {
        let chainId = chainIdList[i]
        if (!priceFeedInfoMap[chainId]) {
            try {
                let rpc = config.rpc[chainIdList].http
                let web3 = new Web3(new HDWalletProvider(process.env.SUBMITTER_KEY, rpc))
                priceFeedInfoMap[chainId] = {}
                priceFeedInfoMap[chainId].web3 = web3
                priceFeedInfoMap[chainId].contracts = []
                priceFeedInfoMap[chainId].tokens = [] //array of array
                priceFeedInfoMap[chainId].descriptions = []
                for (var j = 0; j < contractMap[chainId].length; j++) {
                    console.log('contractMap[chainId][j]', contractMap[chainId][j])
                    let ct = await new web3.eth.Contract(MultiPriceFeedABI, contractMap[chainId][j])
                    priceFeedInfoMap[chainId].contracts.push(ct)
                    priceFeedInfoMap[chainId].tokens.push((await ct.methods.getTokenList().call()))
                    priceFeedInfoMap[chainId].descriptions.push((await ct.methods.description().call()))
                }
            } catch (e) {
                priceFeedInfoMap[chainId] = null
                throw 'Failed to read config data for price feed'
            }
        }
    }
    priceFeedInfoMap.allTokens = config.tokens
    return priceFeedInfoMap
}


module.exports = {
    getLatestDataToSign,
    validateOracleData,
    getConfigData
}