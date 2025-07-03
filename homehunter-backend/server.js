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
    const { name, email, phone, password, role } = req.body;
    try {
        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ message: 'Email already in use' });

        const user = new User({ name, email, phone, password, role });
        await user.save();

        res.status(201).json({ message: 'Registration successful', user: { id: user._id, name, email, role } });
    } catch (err) {
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
        res.status(500).json({ message: 'Error fetching property', error: err.message });
    }
});

// --- Favorites ---
app.post('/api/users/:id/favorites', auth, async (req, res) => {
    try {
        const fav = new Favorite({ userId: req.params.id, propertyId: req.body.propertyId });
        await fav.save();
        res.status(201).json(fav);
    } catch (err) {
        res.status(500).json({ message: 'Error adding favorite', error: err.message });
    }
});

app.get('/api/users/:id/favorites', auth, async (req, res) => {
    try {
        const favorites = await Favorite.find({ userId: req.params.id });
        res.json(favorites);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching favorites', error: err.message });
    }
});

app.delete('/api/users/:id/favorites/:propertyId', auth, async (req, res) => {
    try {
        await Favorite.deleteOne({ userId: req.params.id, propertyId: req.params.propertyId });
        res.json({ message: 'Favorite removed' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting favorite', error: err.message });
    }
});

// --- Search History ---
app.post('/api/users/:id/search-history', auth, async (req, res) => {
    try {
        const record = new SearchHistory({ userId: req.params.id, filters: req.body });
        await record.save();
        const history = await SearchHistory.find({ userId: req.params.id });
        res.json({ message: 'Search saved', searchHistory: history });
    } catch (err) {
        res.status(500).json({ message: 'Error saving history', error: err.message });
    }
});

app.get('/api/users/:id/search-history', auth, async (req, res) => {
    try {
        const history = await SearchHistory.find({ userId: req.params.id });
        res.json(history);
    } catch (err) {
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
        res.status(500).json({ message: 'Error saving preferences', error: err.message });
    }
});

app.get('/api/users/:id/preferences', auth, async (req, res) => {
    try {
        const prefs = await UserPreferences.findOne({ userId: req.params.id });
        res.json(prefs?.preferences || {});
    } catch (err) {
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
        res.status(500).json({ message: 'AI recommendation error', error: err.message });
    }
});

// --- Start Server ---
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
