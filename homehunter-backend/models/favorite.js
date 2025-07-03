const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Favorite', favoriteSchema);
