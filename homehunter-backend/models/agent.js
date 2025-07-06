const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    license: { type: String, required: true },
    idNumber: { type: String, required: true },
    agency: { type: String },
    bio: { type: String },
    idPhotoUrl: { type: String },
    passportPhotoUrl: { type: String },
    certificatePhotoUrl: { type: String },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('Agent', agentSchema);