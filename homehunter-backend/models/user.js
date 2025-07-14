const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['tenant', 'agent', 'admin'], default: 'tenant' }, // Added 'admin' role
    isVerified: { type: Boolean, default: false },
    verificationCode: { type: String },
    verificationCodeExpires: { type: Date } // Expiration date for the verification code
}, { timestamps: true });

// Hash the password before saving the user
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to generate a verification code
userSchema.methods.generateVerificationCode = function () {
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // Generate a 6-digit code
    this.verificationCode = code;
    this.verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // Code expires in 10 minutes
};

// Method to verify the code
userSchema.methods.verifyCode = function (code) {
    const isCodeValid = this.verificationCode === code && this.verificationCodeExpires > Date.now();
    if (isCodeValid) {
        this.isVerified = true;
        this.verificationCode = null;
        this.verificationCodeExpires = null;
    }
    return isCodeValid;
};

module.exports = mongoose.model('User', userSchema);
