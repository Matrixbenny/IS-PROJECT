const mongoose = require('mongoose');

const searchHistorySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    filters: {
        location: String,
        type: String,
        minPrice: Number,
        maxPrice: Number,
        beds: Number,
        baths: Number
    },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SearchHistory', searchHistorySchema);
