const config = require('config')
const chainlinkHelper = require('./helpers/chainlink')
const db = require('./models')

async function main() {
    let tokenMap2 = config.tokens.map(async token => {
        let item = await chainlinkHelper.getTokenPrice(token)
        if (item.price !== null) {
            await db.PriceHistory.updateOne({token: token, exchange: 'chainlink', timestamp: item.timestamp},
                {$set: {price: item.price}}, {upsert: true, new: true})
        }
    })
    await Promise.all(tokenMap2)
    process.exit(0)
}

main()
