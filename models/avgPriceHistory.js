const mongoose = require('mongoose')
const Schema = mongoose.Schema

const AvgPriceHistory = new Schema({
    token: { type: String, index: true },
    price: Number,
    timestamp: { type: Number, index: true },
}, { timestamps: false, v: false })

module.exports = mongoose.model('AvgPriceHistory', AvgPriceHistory)
