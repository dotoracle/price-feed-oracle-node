const config = require('config')
const exchangeHelper = require('./helpers/exchange')

function capitalize(string) {
    return string[0].toUpperCase() + string.slice(1);
}
let sleep = (time) => new Promise((resolve) => setTimeout(resolve, time))

async function main() {
    result = {}
    config.tokens.forEach(token => {
        result[token] = {total: 0, count: 0}
        config.exchanges.forEach(async exchange => {
            func = 'getPriceFrom' + capitalize(exchange)
            let price = await exchangeHelper[func](token)
            if (price !== null) {
                result[token].total += price
                result[token].count += 1
            }
            console.log(token, exchange, price)
        })
    })
    await sleep(3000)
    console.log(result)
}

main()
