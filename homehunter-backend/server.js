// server.js
require('dotenv').config(); // Load environment variables first
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000; // Use port 5000 or specified by environment

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Allows parsing JSON bodies from requests

// -----------------------------------------------------
// Database Connection (MongoDB)
// -----------------------------------------------------
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/homehunter';
mongoose.connect(mongoURI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

// -----------------------------------------------------
// User Schema and Model
// -----------------------------------------------------
const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true },
    password: { type: String, required: true }, // Store hashed password
    role: { type: String, enum: ['tenant', 'agent'], required: true },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// -----------------------------------------------------
// Routes
// -----------------------------------------------------

// Registration Route
app.post('/api/register', async (req, res) => {
    const { fullName, email, phoneNumber, password, role } = req.body;

    try {
        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User with this email already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        user = new User({
            fullName,
            email,
            phoneNumber,
            password: hashedPassword,
            role
        });

        await user.save(); // Save user to database

        res.status(201).json({ msg: 'Registration successful!', user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role } });

    } catch (err) {
        console.error('Registration error:', err.message);
        res.status(500).send('Server error');
    }
});

// Login Route
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if user exists
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Compare entered password with hashed password in database
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // If login successful, you'd typically generate a token here (e.g., JWT)
        // For simplicity, we'll just send user info
        res.json({ msg: 'Login successful!', user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role } });

    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).send('Server error');
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});