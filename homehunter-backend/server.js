// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();

// --- Configuration ---
const PORT = process.env.PORT || 5000; // Use port from .env or default to 5000
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/homehunter';

// --- Middleware ---
// Enable CORS for all origins (adjust for production)
app.use(cors());

// Parse JSON request bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- MongoDB Connection ---
mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB connected successfully!'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        // Exit process with failure
        process.exit(1);
    });

// --- Mongoose Schema and Model for User ---
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required.'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required.'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^[\w-]+(?:\.[\w-]+)*@(?:[\w-]+\.)+[a-zA-Z]{2,7}$/, 'Please enter a valid email address.']
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required.'],
        trim: true,
        // Optional: Add a regex for Kenyan phone numbers if needed, e.g., /^(\+254|0)[7]\d{8}$/
    },
    password: {
        type: String,
        required: [true, 'Password is required.'],
        minlength: [6, 'Password must be at least 6 characters long.']
    },
    role: {
        type: String,
        required: [true, 'Role is required.'],
        enum: ['tenant', 'agent']
    },
    registeredAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true // Adds createdAt and updatedAt fields automatically
});

// Pre-save hook to hash password before saving a new user
userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt(10); // Generate a salt
        this.password = await bcrypt.hash(this.password, salt); // Hash the password
    }
    next();
});

const User = mongoose.model('User', userSchema);

// --- API Routes ---

// @route   POST /api/register
// @desc    Register a new user
// @access  Public
app.post('/api/register', async (req, res) => {
    const { name, email, phone, password, role } = req.body;

    try {
        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User with this email already exists.' });
        }

        // Create new user instance
        user = new User({
            name,
            email,
            phone,
            password, // Password will be hashed by the pre-save hook
            role
        });

        // Save user to database
        await user.save();

        // Respond with success message (do not send password back)
        res.status(201).json({
            message: 'Registration successful!',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (err) {
        // Handle Mongoose validation errors
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        console.error('Server error during registration:', err.message);
        res.status(500).json({ message: 'Server error. Please try again later.' });
    }
});

// @route   GET /api/users (for testing purposes, not for production)
// @desc    Get all users
// @access  Public
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find().select('-password'); // Exclude passwords
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser (if serving static files)`);
});