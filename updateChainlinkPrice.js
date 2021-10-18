const config = require('config')
const chainlinkHelper = require('./helpers/chainlink')
const db = require('./models')

let sleep = (time) => new Promise((resolve) => setTimeout(resolve, time))
async function main() {
    while (true) {
        let tokenMap2 = config.tokens.map(async token => {
            let item = await chainlinkHelper.getTokenPrice(token)
            if (item.price !== null) {
                await db.PriceHistory.updateOne({token: token, exchange: 'chainlink', timestamp: item.timestamp},
                    {$set: {price: item.price}}, {upsert: true, new: true})
            }
        })
        await Promise.all(tokenMap2)

        console.log('sleep 60 seconds before continue')
        await sleep(60000)
    }
}

main()
