// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // Added for JWT
const cors = require('cors');

const app = express();

// --- Configuration ---
const PORT = process.env.PORT || 5000; // Use port from .env or default to 5000
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/homehunter';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey'; // Added for JWT secret

// --- Middleware ---
// Enable CORS for all origins (adjust for production for better security)
// For development, '*' is fine. For production, specify your frontend's domain.
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
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address.']
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required.'],
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Password is required.'],
        minlength: [8, 'Password must be at least 8 characters long.'],
        select: false // Do not return password in queries by default
    },
    role: {
        type: String,
        required: [true, 'Role is required.'],
        enum: ['tenant', 'agent'], // Restrict roles to predefined values
        default: 'tenant'
    }
}, {
    timestamps: true // Automatically adds createdAt and updatedAt timestamps
});

// Pre-save hook to hash password before saving user
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

const User = mongoose.model('User', userSchema);

// --- Routes ---

// @route   POST /api/register
// @desc    Register a new user
// @access  Public
app.post('/api/register', async (req, res) => {
    const { name, email, phone, password, role } = req.body;

    try {
        // Check if user with email already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User with this email already exists.' });
        }

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

// @route   POST /api/login
// @desc    Authenticate user & get token
// @access  Public
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if user exists (and retrieve password as select: false is overridden)
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(400).json({ message: 'Invalid Credentials.' });
        }

        // Compare provided password with hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid Credentials.' });
        }

        // Generate JWT
        const payload = {
            user: {
                id: user.id, // MongoDB's _id is converted to id
                role: user.role
            }
        };

        jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: '1h' }, // Token expires in 1 hour
            (err, token) => {
                if (err) throw err;
                res.json({
                    token,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role
                    }
                });
            }
        );

    } catch (err) {
        console.error('Server error during login:', err.message);
        res.status(500).send('Server Error');
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
    console.log(`Open http://localhost:${PORT}`);
});