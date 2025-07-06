const mongoose = require('mongoose');

const approvedAgentSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Store hashed passwords for security
}, { timestamps: true });

module.exports = mongoose.model('ApprovedAgent', approvedAgentSchema);