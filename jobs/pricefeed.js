require('dotenv').config()
const config = require('config')
const Web3 = require('web3');
const staticWeb3 = new Web3()
const HDWalletProvider = require('@truffle/hdwallet-provider')
const exchangeHelper = require('../helpers/readPrice')
const multipricefeedConfig = config.get("contracts.multipricefeed")
const MultiPriceFeedABI = require('../abi/MultiPriceFeedOracleV2.json')
const threshold = 10    //1%
const db = require('../models');
const logger = require('../helpers/logger');

const chainIdList = Object.keys(multipricefeedConfig)
const contractMap = {}  //contract list based on chain id
chainIdList.forEach(c => contractMap[c] = multipricefeedConfig[c])
const period = 8 * 60;  //8 mionutes
const THRESHOLD_SIGNERS = 66

//data is read from data base and encode all parameters in hex
async function getLatestDataToSign(metadata, configData) {
    let tokens = config.tokens
    let priceMap = {}
    for (let i = 0; i < tokens.length; i++) {
        let price = await db.TokenPrice.findOne({ token: tokens[i] })
        priceMap[tokens[i]] = Math.floor(price.price * 100000000)
    }
    let chainId = metadata.chainId
    let contractAddress = metadata.contractAddress  //oracle contract
    let idx = configData[chainId].contracts.findIndex(e => e.options.address.toLowerCase() == contractAddress.toLowerCase())
    let tokensToEncode = configData[chainId].tokens[idx]
    let priceOfTokensToEncode = tokensToEncode.map(t => priceMap[t])

    let ct = configData[chainId].contracts[idx]
    let latestRoundInfo = await ct.methods.latestRoundInfo().call()
    let description = configData[chainId].descriptions[idx]
    let currentRound = parseInt(latestRoundInfo.roundId)
    let nextRound = currentRound + 1
    let updatedAt = parseInt(latestRoundInfo.updatedAt)
    let lastUpdated = updatedAt
    let now = Math.floor(Date.now() / 1000)
    lastUpdated = lastUpdated == 0 ? now : lastUpdated
    updatedAt = now > updatedAt ? now : updatedAt
    let deadline = updatedAt + 200//valid til 200s

    let web3 = configData[chainId].web3
    const encoded = web3.eth.abi.encodeParameters(['uint32', 'address', 'int256[]', 'uint256', "string[]", "string"], [nextRound, contractAddress, priceOfTokensToEncode, deadline, tokensToEncode, description])
    return { data: encoded, lastUpdated: lastUpdated }
}

//validate data received from other oracles with the locally stpred data in DB
async function validateOracleData(data, metadata, configData) {
    let decoded
    try {
        decoded = staticWeb3.eth.abi.decodeParameters([
            { type: 'uint32', name: 'roundId' },
            { type: 'address', name: 'contractAddress' },
            { type: 'int256[]', name: 'prices' },
            { type: 'uint256', name: 'deadline' },
            { type: 'string[]', name: 'tokens' },
            { type: 'string', name: 'description' },
        ], data)
    } catch (e) {
        return false;
    }

    let chainId = metadata.chainId
    let contractAddress = metadata.contractAddress
    let idx = configData[chainId].contracts.findIndex(e => e.options.address.toLowerCase() == contractAddress.toLowerCase())

    let tokensOfContract = configData[chainId].tokens[idx]

    let tokens = decoded.tokens
    if (JSON.stringify(tokensOfContract) != JSON.stringify(tokens)) {
        logger.warn('Token list invalid %s %s', tokensOfContract, tokens)
        return false;
    }

    let ct = configData[chainId].contracts[idx]
    let latestRoundInfo = await ct.methods.latestRoundInfo().call()
    let description = configData[chainId].descriptions[idx]
    let currentRound = parseInt(latestRoundInfo.roundId)
    let nextRound = currentRound + 1

    if (description != decoded.description) {
        logger.warn('Token description invalid')
        return false;
    }
    if (nextRound != decoded.roundId) {
        logger.warn('Round invalid %d', nextRound)
        return false;
    }

    let updatedAt = parseInt(latestRoundInfo.updatedAt)
    let now = Math.floor(Date.now() / 1000)
    updatedAt = now > updatedAt ? now : updatedAt
    let deadline = updatedAt + 200//valid til 200s
    if (decoded.deadline > deadline) {
        logger.warn('Deadline invalid')
        return false;
    }

    if (ct.options.address.toLowerCase() != metadata.contractAddress.toLowerCase()) {
        logger.warn('Contract address invalid')
        return false;
    }

    //verify prices are not much different from data base
    for (let i = 0; i < tokens.length; i++) {
        let price = await db.TokenPrice.findOne({ token: tokens[i] })
        price = Math.floor(price.price * 100000000)

        let diff = Math.abs(parseInt(decoded.prices[i]) - price)
        let diffInPercentX10 = diff * 1000 / price
        if (diffInPercentX10 > threshold) {
            logger.warn('Token price differ over threshold, token %s price received %d, price local %d', tokens[i], decoded.prices[i], price)
            return false;
        }
    }

    return true
}

function signersSufficient(metadata, configData, currentNumSigners) {
    let oracleAddresses = configData[metadata.chainId].oracleAddresses[metadata.contractAddress]
    return currentNumSigners * 100 / oracleAddresses.length >= THRESHOLD_SIGNERS
}

async function getConfigData() {
    const priceFeedInfoMap = {}
    //reading price feed  contract info
    for (var i = 0; i < chainIdList.length; i++) {
        let chainId = chainIdList[i]
        if (!priceFeedInfoMap[chainId]) {
            try {
                let rpc = config.rpc[chainIdList].http
                let web3 = new Web3(new HDWalletProvider(process.env.SUBMITTER_KEY, rpc))
                let accounts = await web3.eth.getAccounts()
                priceFeedInfoMap.ACCOUNT = accounts[0]
                priceFeedInfoMap[chainId] = {}
                priceFeedInfoMap[chainId].web3 = web3
                priceFeedInfoMap[chainId].contracts = []
                priceFeedInfoMap[chainId].tokens = [] //array of array
                priceFeedInfoMap[chainId].descriptions = []
                priceFeedInfoMap[chainId].oracleAddresses = {}
                for (var j = 0; j < contractMap[chainId].length; j++) {
                    console.log('contractMap[chainId][j]', contractMap[chainId][j])
                    let ct = await new web3.eth.Contract(MultiPriceFeedABI, contractMap[chainId][j])
                    priceFeedInfoMap[chainId].contracts.push(ct)
                    priceFeedInfoMap[chainId].tokens.push((await ct.methods.getTokenList().call()))
                    priceFeedInfoMap[chainId].descriptions.push((await ct.methods.description().call()))
                    let oracleAddresses = await ct.methods.getOracles().call()
                    priceFeedInfoMap[chainId].oracleAddresses[ct.options.address] = oracleAddresses
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


async function submitTransaction(metadata, configData, oracleData, r, s, v) {
    let decoded
    try {
        decoded = staticWeb3.eth.abi.decodeParameters([
            { type: 'uint32', name: 'roundId' },
            { type: 'address', name: 'contractAddress' },
            { type: 'int256[]', name: 'prices' },
            { type: 'uint256', name: 'deadline' },
            { type: 'string[]', name: 'tokens' },
            { type: 'string', name: 'description' },
        ], oracleData)


        let chainId = metadata.chainId
        let contractAddress = metadata.contractAddress
        let idx = configData[chainId].contracts.findIndex(e => e.options.address.toLowerCase() == contractAddress.toLowerCase())

        let rpc = config.rpc[chainIdList].http
        let web3 = new Web3(new HDWalletProvider(process.env.SUBMITTER_KEY, rpc))
        let ct = await new web3.eth.Contract(MultiPriceFeedABI, contractAddress)

        let latestRoundInfo = await ct.methods.latestRoundInfo().call()
        let currentRound = parseInt(latestRoundInfo.roundId)
        if (currentRound != parseInt(decoded.roundId)) {
            //estimate tx fails or not
            await ct.methods.submit(decoded.roundId, decoded.prices, decoded.deadline, r, s, v).estimateGas({ from: configData.ACCOUNT, gas: 2000000 })
            await ct.methods.submit(decoded.roundId, decoded.prices, decoded.deadline, r, s, v).send({ from: configData.ACCOUNT, gas: 2000000, gasPrice: 20000000000 })
        }
    } catch (e) {
        logger.error('Error in submitting tx %s', e);
    }
}

module.exports = {
    getLatestDataToSign,
    validateOracleData,
    getConfigData,
    signersSufficient,
    submitTransaction
}