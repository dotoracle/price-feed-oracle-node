const config = require('config')
const exchangeHelper = require('./helpers/exchange')

function capitalize(string) {
    return string[0].toUpperCase() + string.slice(1);
}
let sleep = (time) => new Promise((resolve) => setTimeout(resolve, time))

async function main() {
    console.log('start', new Date())
    let tokenMap = config.tokens.map(async token => {
        let exchangeMap = config.exchanges.map(async exchange => {
            let func = 'getPriceFrom' + capitalize(exchange)
            return await exchangeHelper[func](token)
        })
        let data = await Promise.all(exchangeMap)
        return {token: token, price: data}
    })
    let result = await Promise.all(tokenMap)
    result.forEach(item => {
        console.log(item.token, (item.price.reduce((a, b) => a + b, 0)) / item.price.filter(x => x !== null).length)
    })
    console.log('end', new Date())
}

main()
