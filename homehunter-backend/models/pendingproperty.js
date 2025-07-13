const mongoose = require('mongoose');

const PendingPropertySchema = new mongoose.Schema({
    title: String,
    location: String,
    price: Number,
    description: String,
    beds: Number,
    baths: Number,
    type: String,
    features: String,
    ownerPhone: String,
    imageUrl: String,
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PendingProperty', PendingPropertySchema);