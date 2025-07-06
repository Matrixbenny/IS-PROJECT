const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
    name: { type: String, required: true },
    location: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String, required: true },
    phone: { type: String, required: true },
    imageUrl: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Property', propertySchema);
