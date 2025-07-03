const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
    title: String,
    location: String,
    price: Number,
    type: String,
    bedrooms: Number,
    bathrooms: Number,
    features: [String],
    imageUrls: [String],
    coordinates: {
        lat: Number,
        lng: Number
    },
    description: String,
    ownerPhone: String
}, { timestamps: true });

module.exports = mongoose.model('Property', propertySchema);
