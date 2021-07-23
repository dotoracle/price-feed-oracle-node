const config = require('config')
const Web3 = require('web3');
const exchangeHelper = require('./helpers/readPrice')
const multipricefeedConfig = config.get("contracts.multipricefeed")
const chainIdList = Object.keys(multipricefeedConfig)
const contractMap = {}
chainIdList.forEach(c => contractMap[c] = multipricefeedConfig[c])
//chainId => {contract object, token list, description, web3}
const priceFeedInfoMap = {}

async function main() {
    //reading price feed info
    console.log('start', new Date())
    
    let priceMap = await exchangeHelper.readPrices()
    console.log(priceMap)
    console.log('end', new Date())
}

setInterval(async () => {
    await main()
}, 10000)
