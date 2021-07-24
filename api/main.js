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
    let history = await db.AvgPriceHistory.find({token: token}, {timestamp: 1, price: 1, _id: 0}).sort({timestamp: -1}).limit(1000)

    let lastPrice = await db.PriceHistory.find({token: token}).sort({timestamp: -1}).limit(1)
    let dotoracle = await db.PriceHistory.find({token: token, exchange: 'dotoracle'}).sort({timestamp: -1}).limit(1)
    let chainlink = await db.PriceHistory.find({token: token, exchange: 'chainlink'}).sort({timestamp: -1}).limit(1)
    let allExchangePrice = []
    if (lastPrice.length > 0) {
        allExchangePrice = await db.PriceHistory.find({token: token, timestamp: lastPrice[0].timestamp})
    }
    if (dotoracle.length > 0) {
        allExchangePrice.push(dotoracle[0])
    }
    if (chainlink.length > 0) {
        allExchangePrice.push(chainlink[0])
    }

    return res.json({
        price: price.price,
        history: history,
        allExchangePrice: allExchangePrice,
    })
})



module.exports = router
