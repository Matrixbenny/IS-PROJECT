const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
    title: { type: String, required: true }, // Property title
    location: { type: String, required: true }, // Property location
    price: { type: Number, required: true }, // Property price
    description: { type: String, required: true }, // Property description
    beds: { type: Number, required: true }, // Number of bedrooms
    baths: { type: Number, required: true }, // Number of bathrooms
    type: { type: String, required: true }, // Property type (e.g., Apartment, House)
    features: { type: String }, // Additional features (e.g., Swimming Pool, Gym)
    ownerPhone: { type: String, required: true }, // Owner's phone number
    imageUrl: { type: String, required: true }, // URL of the property image
    createdAt: { type: Date, default: Date.now } // Timestamp for creation
});

module.exports = mongoose.model('Property', propertySchema);
