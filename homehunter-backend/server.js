require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const bodyParser = require('body-parser');
const cors = require('cors');
const fetch = require('node-fetch'); // For calling Flask AI API
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const Agent = require('./models/agent');
const multer = require('multer');
const path = require('path');

// --- Import Models ---
const User = require('./models/User');
const Property = require('./models/Property');
const Favorite = require('./models/Favorite');
const SearchHistory = require('./models/SearchHistory');
const UserPreferences = require('./models/UserPreferences');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/agents/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.fieldname + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Ensure uploads/agents directory exists
const fs = require('fs');
const uploadDir = 'uploads/agents';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

// --- Connect to MongoDB ---
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err));

// --- Middleware ---
app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static('uploads'));

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
    const { fullName, emailAddress, phoneNumber, password, userRole } = req.body;
    if (!fullName || !emailAddress || !phoneNumber || !password || !userRole) {
        return res.status(400).json({ message: 'Please enter all fields.' });
    }
    try {
        let user = await User.findOne({ email: emailAddress });
        if (user) {
            return res.status(400).json({ message: 'User with that email already exists.' });
        }
        // Generate 6-digit confirmation code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const codeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry
        const newUser = new User({
            name: fullName,
            email: emailAddress,
            phone: phoneNumber,
            password: password,
            role: userRole,
            isVerified: false,
            verificationCode,
            verificationCodeExpires: codeExpires
        });
        await newUser.save();
        // Send code via Gmail SMTP
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: newUser.email,
            subject: 'Your HomeHunter Kenya Confirmation Code',
            html: `<p>Your confirmation code is: <b>${verificationCode}</b></p><p>This code will expire in 15 minutes.</p>`
        });
        res.status(201).json({
            message: 'Registration successful! Please check your email for the confirmation code.'
        });
    } catch (err) {
        console.error('Registration error:', err.message);
        res.status(500).json({ message: 'Registration error', error: err.message });
    }
});


// --- Confirmation Code Verification Endpoint ---
app.post('/api/verify-code', async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ message: 'Email and code are required.' });
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'User not found.' });
        if (user.isVerified) return res.status(400).json({ message: 'User already verified.' });
        if (user.verificationCode !== code) return res.status(400).json({ message: 'Invalid confirmation code.' });
        if (user.verificationCodeExpires < new Date()) return res.status(400).json({ message: 'Confirmation code expired.' });
        user.isVerified = true;
        user.verificationCode = undefined;
        user.verificationCodeExpires = undefined;
        await user.save();
        res.json({ message: 'Account verified successfully! You can now log in.' });
    } catch (err) {
        res.status(500).json({ message: 'Verification error', error: err.message });
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
        if (!user.isVerified) {
            return res.status(403).json({ message: 'Please verify your email before logging in.' });
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

// --- Agent Profile Submission ---
app.post('/api/agents/profile', upload.fields([
    { name: 'idPhoto', maxCount: 1 },
    { name: 'passportPhoto', maxCount: 1 },
    { name: 'certificatePhoto', maxCount: 1 }
]), async (req, res) => {
    try {
        const { fullName, phone, license, idNumber, agency, bio } = req.body;
        const idPhotoUrl = req.files['idPhoto'] ? `/uploads/agents/${req.files['idPhoto'][0].filename}` : '';
        const passportPhotoUrl = req.files['passportPhoto'] ? `/uploads/agents/${req.files['passportPhoto'][0].filename}` : '';
        const certificatePhotoUrl = req.files['certificatePhoto'] ? `/uploads/agents/${req.files['certificatePhoto'][0].filename}` : '';

        const agent = new Agent({
            fullName,
            phone,
            license,
            idNumber,
            agency,
            bio,
            idPhotoUrl,
            passportPhotoUrl,
            certificatePhotoUrl,
            status: 'pending'
        });
        await agent.save();
        res.status(201).json({ message: 'Agent profile submitted for approval.' });
    } catch (err) {
        console.error('Agent profile submission error:', err.message);
        res.status(500).json({ message: 'Agent profile submission error', error: err.message });
    }
});

// Get all pending agents for admin
app.get('/api/admin/pending-agents', async (req, res) => {
    try {
        const agents = await Agent.find({ status: 'pending' }).sort({ createdAt: -1 });
        res.json(agents);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching agents.' });
    }
});

// --- Start Server ---
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));