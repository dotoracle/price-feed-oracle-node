const config = require('config')
const chainlinkHelper = require('./helpers/chainlink')
const db = require('./models')
const Web3 = require('web3')
const BigNumber = require('bignumber.js')
const dotABI = require('./abi/MultiPriceFeedOracleV2.json')

let sleep = (time) => new Promise((resolve) => setTimeout(resolve, time))
async function main() {
    while (true) {
        let web3 = await new Web3(new Web3.providers.HttpProvider(config.rpc['97'].http))
        let contract = await new web3.eth.Contract(dotABI, config.contracts.multipricefeed['97'][0])
        let tokens = await contract.methods.getTokenList().call()
        let lastRoundData = await contract.methods.latestRoundInfo().call()


        let timestamp = lastRoundData.updatedAt
        let answers = lastRoundData.answers

        for (let i = 0; i < tokens.length; i++) {
            let token = tokens[i]
            let price = new BigNumber(answers[i])
            price = price.div(10 ** 8).toNumber()
            await db.PriceHistory.updateOne({token: token, exchange: 'dotoracle', timestamp: timestamp},
                {$set: {price: price}}, {upsert: true, new: true})
        }

        console.log('sleep 60 seconds before continue')
        await sleep(60000)
    }
}

main()
