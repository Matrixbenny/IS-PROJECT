const mongoose = require('mongoose');

const userPreferencesSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    preferences: {
        location: String,
        type: String,
        minPrice: Number,
        maxPrice: Number,
        beds: Number,
        baths: Number,
        features: [String]
    }
});

module.exports = mongoose.model('UserPreferences', userPreferencesSchema);
