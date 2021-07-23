const mongoose = require('mongoose')
const Schema = mongoose.Schema

const PriceHistory = new Schema({
    token: { type: String, index: true },
    exchange: { type: String, index: true },
    price: Number,
    timestamp: { type: Number, index: true },
}, { timestamps: false, v: false })

module.exports = mongoose.model('PriceHistory', PriceHistory)
