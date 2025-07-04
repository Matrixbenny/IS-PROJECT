require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');
const fetch = require('node-fetch'); // For calling Flask AI API

// --- Import Models ---
const User = require('./models/User');
const Property = require('./models/Property');
const Favorite = require('./models/Favorite');
const SearchHistory = require('./models/SearchHistory');
const UserPreferences = require('./models/UserPreferences');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

// --- Connect to MongoDB ---
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err));

// --- Middleware ---
app.use(cors());
app.use(bodyParser.json());

// --- JWT Auth Middleware ---
const auth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

// ==========================
// ✅ ROUTES START HERE
// ==========================

// --- Register ---
app.post('/api/register', async (req, res) => {
    // MODIFIED: Destructure body to match frontend's auth.js data structure
    const { fullName, emailAddress, phoneNumber, password, userRole } = req.body;

    // Basic validation
    if (!fullName || !emailAddress || !phoneNumber || !password || !userRole) {
        return res.status(400).json({ message: 'Please enter all fields.' });
    }

    try {
        let user = await User.findOne({ email: emailAddress }); // Check using emailAddress
        if (user) {
            return res.status(400).json({ message: 'User with that email already exists.' });
        }

        // Create new user instance, mapping frontend names to backend model names
        const newUser = new User({
            name: fullName,       // Frontend fullName maps to backend name
            email: emailAddress, // Frontend emailAddress maps to backend email
            phone: phoneNumber,   // Frontend phoneNumber maps to backend phone
            password: password,   // Password hashing handled by pre('save') hook in models/User.js
            role: userRole        // Frontend userRole maps to backend role
        });

        await newUser.save();

        // After successful registration, generate a token and send it back
        const payload = {
            user: {
                id: newUser._id,
                role: newUser.role
            }
        };

        jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: '1h' }, // Token expires in 1 hour
            (err, token) => {
                if (err) throw err;
                // Send token and specific user details back to the frontend
                res.status(201).json({
                    message: 'Registration successful and automatically logged in!',
                    token,
                    user: {
                        id: newUser._id,
                        name: newUser.name,
                        email: newUser.email,
                        role: newUser.role
                    }
                });
            }
        );

    } catch (err) {
        console.error('Registration error:', err.message);
        res.status(500).json({ message: 'Registration error', error: err.message });
    }
});

// --- Login ---
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email }).select('+password');
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ user: { id: user._id, role: user.role } }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ message: 'Login error', error: err.message });
    }
});

// --- Add a Property ---
app.post('/api/properties', auth, async (req, res) => {
    try {
        const property = new Property(req.body);
        await property.save();
        res.status(201).json(property);
    } catch (err) {
        console.error('Property creation error:', err.message);
        res.status(400).json({ message: 'Property creation error', error: err.message });
    }
});

// --- Get All or Filtered Properties ---
app.get('/api/properties', async (req, res) => {
    const filters = req.query;
    const query = {};

    if (filters.location) query.location = { $regex: filters.location, $options: 'i' };
    if (filters.type) query.type = filters.type;
    if (filters.minPrice || filters.maxPrice) {
        query.price = {};
        if (filters.minPrice) query.price.$gte = Number(filters.minPrice);
        if (filters.maxPrice) query.price.$lte = Number(filters.maxPrice);
    }

    try {
        const properties = await Property.find(query);
        res.json(properties);
    } catch (err) {
        console.error('Property fetch error:', err.message);
        res.status(500).json({ message: 'Property fetch error', error: err.message });
    }
});

// --- Get Property Details ---
app.get('/api/properties/:id', async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        if (!property) return res.status(404).json({ message: 'Property not found' });
        res.json(property);
    } catch (err) {
        console.error('Error fetching property:', err.message);
        res.status(500).json({ message: 'Error fetching property', error: err.message });
    }
});

// --- Favorites ---
app.post('/api/users/:id/favorites', auth, async (req, res) => {
    try {
        // Ensure propertyId is sent in the request body
        if (!req.body.propertyId) {
            return res.status(400).json({ message: 'Property ID is required.' });
        }
        const fav = new Favorite({ userId: req.params.id, propertyId: req.body.propertyId });
        await fav.save();
        res.status(201).json(fav);
    } catch (err) {
        console.error('Error adding favorite:', err.message);
        res.status(500).json({ message: 'Error adding favorite', error: err.message });
    }
});

app.get('/api/users/:id/favorites', auth, async (req, res) => {
    try {
        const favorites = await Favorite.find({ userId: req.params.id }).populate('propertyId'); // Populate to get property details
        res.json(favorites);
    } catch (err) {
        console.error('Error fetching favorites:', err.message);
        res.status(500).json({ message: 'Error fetching favorites', error: err.message });
    }
});

app.delete('/api/users/:id/favorites/:propertyId', auth, async (req, res) => {
    try {
        await Favorite.deleteOne({ userId: req.params.id, propertyId: req.params.propertyId });
        res.json({ message: 'Favorite removed' });
    } catch (err) {
        console.error('Error deleting favorite:', err.message);
        res.status(500).json({ message: 'Error deleting favorite', error: err.message });
    }
});

// --- Search History ---
app.post('/api/users/:id/search-history', auth, async (req, res) => {
    try {
        const record = new SearchHistory({ userId: req.params.id, filters: req.body });
        await record.save();
        // Optionally, return the full history, or just a confirmation
        const history = await SearchHistory.find({ userId: req.params.id }).sort({ timestamp: -1 });
        res.json({ message: 'Search saved', searchHistory: history });
    } catch (err) {
        console.error('Error saving history:', err.message);
        res.status(500).json({ message: 'Error saving history', error: err.message });
    }
});

app.get('/api/users/:id/search-history', auth, async (req, res) => {
    try {
        const history = await SearchHistory.find({ userId: req.params.id }).sort({ timestamp: -1 }); // Sort by newest first
        res.json(history);
    } catch (err) {
        console.error('Error fetching history:', err.message);
        res.status(500).json({ message: 'Error fetching history', error: err.message });
    }
});

// --- Preferences ---
app.put('/api/users/:id/preferences', auth, async (req, res) => {
    try {
        const updated = await UserPreferences.findOneAndUpdate(
            { userId: req.params.id },
            { preferences: req.body },
            { upsert: true, new: true }
        );
        res.json({ message: 'Preferences saved', preferences: updated.preferences });
    } catch (err) {
        console.error('Error saving preferences:', err.message);
        res.status(500).json({ message: 'Error saving preferences', error: err.message });
    }
});

app.get('/api/users/:id/preferences', auth, async (req, res) => {
    try {
        const prefs = await UserPreferences.findOne({ userId: req.params.id });
        res.json(prefs?.preferences || {});
    } catch (err) {
        console.error('Error fetching preferences:', err.message);
        res.status(500).json({ message: 'Error fetching preferences', error: err.message });
    }
});

// --- AI Recommendations (calls Flask) ---
app.post('/api/recommendations', auth, async (req, res) => {
    try {
        const flaskResponse = await fetch('http://localhost:5001/recommendations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const data = await flaskResponse.json();
        res.json({ recommendations: data });
    } catch (err) {
        console.error('AI recommendation error:', err.message);
        res.status(500).json({ message: 'AI recommendation error', error: err.message });
    }
});

// --- Start Server ---
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));