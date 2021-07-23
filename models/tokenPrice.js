const mongoose = require('mongoose')
const Schema = mongoose.Schema

const TokenPrice = new Schema({
    token: { type: String, index: true },
    price: Number,
    timestamp: Number,
}, { timestamps: false, v: false })

module.exports = mongoose.model('TokenPrice', TokenPrice)
