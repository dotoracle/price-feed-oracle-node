const config = require('config')
const chainlinkHelper = require('./helpers/chainlink')
const db = require('./models')
const Web3 = require('web3')
const BigNumber = require('bignumber.js')
const dotABI = [
    {
        "inputs": [],
        "name": "description",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "_roundId", "type": "uint256"}],
        "name": "getAnswerByRound",
        "outputs": [{"internalType": "int256[]", "name": "", "type": "int256[]"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint32", "name": "_tokenIndex", "type": "uint32"},
            {
                "internalType": "uint256",
                "name": "_roundId",
                "type": "uint256"
            }],
        "name": "getAnswerByRoundOfToken",
        "outputs": [{"internalType": "int256", "name": "", "type": "int256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint80", "name": "_roundId", "type": "uint80"}],
        "name": "getRoundInfo",
        "outputs": [{"internalType": "uint80", "name": "roundId", "type": "uint80"},
            {
                "internalType": "int256[]",
                "name": "answers",
                "type": "int256[]"
            },
            {"internalType": "uint256", "name": "updatedAt", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint32", "name": "_tokenIndex", "type": "uint32"},
            {
                "internalType": "uint80",
                "name": "_roundId",
                "type": "uint80"
            }],
        "name": "getRoundInfoOfToken",
        "outputs": [{"internalType": "uint80", "name": "roundId", "type": "uint80"},
            {
                "internalType": "int256",
                "name": "answer",
                "type": "int256"
            },
            {"internalType": "uint256", "name": "updatedAt", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getTokenList",
        "outputs": [{"internalType": "string[]", "name": "", "type": "string[]"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "latestAnswer",
        "outputs": [{"internalType": "int256[]", "name": "", "type": "int256[]"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint32", "name": "_tokenIndex", "type": "uint32"}],
        "name": "latestAnswerOfToken",
        "outputs": [{"internalType": "int256", "name": "", "type": "int256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "latestRound",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "latestRoundInfo",
        "outputs": [{"internalType": "uint80", "name": "roundId", "type": "uint80"},
            {
                "internalType": "int256[]",
                "name": "answers",
                "type": "int256[]"
            },
            {"internalType": "uint256", "name": "updatedAt", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint32", "name": "_tokenIndex", "type": "uint32"}],
        "name": "latestRoundInfoOfToken",
        "outputs": [{"internalType": "uint80", "name": "roundId", "type": "uint80"},
            {
                "internalType": "int256",
                "name": "answer",
                "type": "int256"
            },
            {"internalType": "uint256", "name": "updatedAt", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "oracleCount",
        "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "_oracle", "type": "address"},
            {
                "internalType": "uint32",
                "name": "_queriedRoundId",
                "type": "uint32"
            }],
        "name": "oracleRoundState",
        "outputs": [{"internalType": "bool", "name": "_eligibleToSubmit", "type": "bool"},
            {
                "internalType": "uint32",
                "name": "_roundId",
                "type": "uint32"
            },
            {"internalType": "uint128", "name": "_availableFunds", "type": "uint128"},
            {
                "internalType": "uint8",
                "name": "_oracleCount",
                "type": "uint8"
            },
            {"internalType": "uint128", "name": "_paymentAmount", "type": "uint128"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "", "type": "address"}],
        "name": "submitterRewards",
        "outputs": [{"internalType": "uint64", "name": "lastUpdated", "type": "uint64"},
            {
                "internalType": "uint128",
                "name": "releasable",
                "type": "uint128"
            },
            {"internalType": "uint128", "name": "remainVesting", "type": "uint128"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "name": "tokenList",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function"
    },
]

async function main() {
    let web3 = await new Web3(new Web3.providers.HttpProvider(config.rpc["97"].http))
    let contract = await new web3.eth.Contract(dotABI, '0x8ffe8f68833af4d07a8fdedb32f204a4201ba21d')
    let tokens = await contract.methods.getTokenList().call()
    let lastRoundData = await contract.methods.latestRoundInfo().call()


    let timestamp = lastRoundData.updatedAt
    let answers = lastRoundData.answers

    for (let i = 0; i < tokens.length; i++) {
        let token = tokens[i]
        let price = new BigNumber(answers[i])
        price = price.div(10**8).toNumber()
        await db.PriceHistory.updateOne({token: token, exchange: 'dotoracle', timestamp: timestamp},
            {$set: {price: price}}, {upsert: true, new: true})
    }
    process.exit(0)
}

main()
