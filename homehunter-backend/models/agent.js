const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true }, // Ensure email is required
    phone: { type: String, required: true },
    license: { type: String },
    idNumber: { type: String },
    agency: { type: String },
    bio: { type: String },
    idPhotoUrl: { type: String },
    passportPhotoUrl: { type: String },
    certificatePhotoUrl: { type: String },
    status: { type: String, default: 'pending' },
    otp: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Agent', agentSchema);