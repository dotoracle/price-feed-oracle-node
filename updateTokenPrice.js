const config = require('config')
const exchangeHelper = require('./helpers/exchange')
const db = require('./models')
const logger = require('./helpers/logger')

function capitalize(string) {
  return string[0].toUpperCase() + string.slice(1)
}

let sleep = (time) => new Promise((resolve) => setTimeout(resolve, time))
async function main() {
  while (true) {
    let timestamp = Math.round(new Date().getTime() / 1000)
    let data = []
    let tokenMap1 = config.tokens.map(async (token) => {
      let exchangeMap = config.exchanges.map(async (exchange) => {
        let func = 'getPriceFrom' + capitalize(exchange)
        let price = null
        try {
          price = await exchangeHelper[func](token)
        } catch (e) {
          console.log(token, exchange)
        }
        if (price !== null) {
          data.push({
            token: token,
            exchange: exchange,
            price: price,
            timestamp: timestamp,
          })
        }
        return price
      })
      let item = await Promise.all(exchangeMap)
      return { token: token, price: item }
    })
    let result = await Promise.all(tokenMap1)

    await db.PriceHistory.insertMany(data)

    let avgHistory = []
    for (let i = 0; i < result.length; i++) {
      let item = result[i]
      let avg =
        item.price.reduce((a, b) => a + b, 0) /
        item.price.filter((x) => x !== null).length
      avgHistory.push({
        token: item.token,
        price: avg,
        timestamp: timestamp,
      })
      await db.TokenPrice.updateOne(
        { token: item.token },
        { $set: { price: avg, timestamp: timestamp } },
        { upsert: true, new: true },
      )
    }
    if (avgHistory.length > 0) {
      await db.AvgPriceHistory.insertMany(avgHistory)
    }

    logger.info('get all token price at from all CEX. Sleep 60 seconds before continue')
    await sleep(60000)
  }
}

main()
