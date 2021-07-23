const express = require('express')
const router = express.Router()
const db = require('../models')
const { check, validationResult, query } = require('express-validator')

router.get('/tokens/', [], async function (req, res, next) {

    let tokens = await db.TokenPrice.find()
    return res.json({tokens: tokens})
})

router.get('/tokens/:token',[
    check('token').exists().withMessage('token is required.')
], async function (req, res, next) {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
    }
    let token = req.params.token.toLowerCase()
    let price = await db.TokenPrice.findOne({token: token})
    let history = await db.AvgPriceHistory.find({token: token}).sort({updateAt: -1}).limit(1440)
    let historyArr = []
    for (let i = history.length - 1; i >= 0; i--) {
        historyArr.push(history[i].price)
    }
    let startTime = history[history.length - 1].timestamp
    let endTime = history[0].timestamp
    let range = []
    for (let i = startTime; i < endTime; i+= 1000) {
        if (i > endTime) {
            i = endTime
        }
        range.push(i)
    }
    let lastPrice = await db.PriceHistory.find({token: token}).sort({timestamp: -1}).limit(1)
    let allExchangePrice = []
    if (lastPrice.length > 0) {
        allExchangePrice = await db.PriceHistory.find({token: token, timestamp: lastPrice[0].timestamp})
    }

    return res.json({
        price: price.price,
        range: range,
        history: historyArr,
        allExchangePrice: allExchangePrice,
    })
})



module.exports = router
