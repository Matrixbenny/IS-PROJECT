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

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/properties/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Ensure uploads/properties directory exists
const fs = require('fs');
const uploadDir = 'uploads/properties';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

// --- Import Models ---
const User = require('./models/User');
const Property = require('./models/Property');
const SearchHistory = require('./models/SearchHistory');
const UserPreferences = require('./models/UserPreferences');
const ApprovedAgent = require('./models/approved-agents'); // Import the model
const Message = require('./models/Message'); // Import Message model for analytics
const Bookmark = require('./models/Bookmark'); // Import the Bookmark model
const Feedback = require('./models/Feedback'); // Import Feedback model

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
        const { fullName, email, phone, license, idNumber, agency, bio } = req.body;
        const idPhotoUrl = req.files['idPhoto'] ? `/uploads/agents/${req.files['idPhoto'][0].filename}` : '';
        const passportPhotoUrl = req.files['passportPhoto'] ? `/uploads/agents/${req.files['passportPhoto'][0].filename}` : '';
        const certificatePhotoUrl = req.files['certificatePhoto'] ? `/uploads/agents/${req.files['certificatePhoto'][0].filename}` : '';

        const agent = new Agent({
            fullName,
            email, // Ensure email is included
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

const sendApprovalEmail = async (agent, otp) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: agent.email,
        subject: 'Agent Approval - HomeHunter Kenya',
        html: `<p>Dear ${agent.fullName},</p>
               <p>Congratulations! Your application has been approved.</p>
               <p>Your OTP is: <b>${otp}</b></p>
               <p>Thank you for joining HomeHunter Kenya!</p>`
    };

    await transporter.sendMail(mailOptions);
};

// Update agent status (approved/rejected)
app.patch('/api/admin/agent-status/:agentId', async (req, res) => {
    const { agentId } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status value.' });
    }

    try {
        const agent = await Agent.findById(agentId);
        if (!agent) {
            return res.status(404).json({ message: 'Agent not found.' });
        }

        agent.status = status;

        if (status === 'approved') {
            // Generate OTP for approved agents
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            agent.otp = otp; // Save OTP to the agent's record
            await sendApprovalEmail(agent, otp);
        } else if (status === 'rejected') {
            await sendRejectionEmail(agent);
        }

        await agent.save();
        res.json({ message: `Agent status updated to ${status}.` });
    } catch (err) {
        console.error('Error updating agent status:', err.message);
        res.status(500).json({ message: 'Error updating agent status.', error: err.message });
    }
});

// --- OTP Verification for Agents ---
app.post('/api/agents/verify-otp', async (req, res) => {
    const { email, otp } = req.body;

    try {
        const agent = await Agent.findOne({ email, otp });
        if (!agent) {
            return res.status(400).json({ message: 'Invalid OTP or email.' });
        }

        res.status(200).json({ message: 'OTP verified successfully.' });
    } catch (err) {
        console.error('Error verifying OTP:', err.message);
        res.status(500).json({ message: 'Network error. Please try again.', error: err.message });
    }
});

// --- Agent Login ---
app.post('/api/agents/login', async (req, res) => {
    const { email, otp } = req.body;

    try {
        const agent = await Agent.findOne({ email, otp });
        if (!agent) {
            return res.status(400).json({ message: 'Invalid OTP or email.' });
        }

        res.status(200).json({ success: true, message: 'Login successful!' });
    } catch (err) {
        console.error('Error during agent login:', err.message);
        res.status(500).json({ message: 'Network error. Please try again.', error: err.message });
    }
});

// --- Save Login Details for Approved Agents ---
app.post('/api/agents/save-login-details', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Hash the password before saving (use bcrypt or similar library)
        const hashedPassword = password; // Replace with hashed password logic

        const newAgent = new ApprovedAgent({ email, password: hashedPassword });
        await newAgent.save();

        res.status(201).json({ message: 'Login details saved successfully!' });
    } catch (err) {
        console.error('Error saving login details:', err.message);
        res.status(500).json({ message: 'Error saving login details.', error: err.message });
    }
});

// --- Agent Authentication ---
app.post('/api/agents/authenticate', async (req, res) => {
    const { email, password } = req.body;

    try {
        const agent = await ApprovedAgent.findOne({ email });
        if (!agent || agent.password !== password) { // Replace with hashed password comparison
            return res.status(400).json({ message: 'Invalid email or password.' });
        }

        res.status(200).json({
            success: true,
            message: 'Login successful!',
            agent: { email: agent.email } // Return agent data for the profile card
        });
    } catch (err) {
        console.error('Error during authentication:', err.message);
        res.status(500).json({ message: 'Network error. Please try again.', error: err.message });
    }
});

// --- Analytics View (Admin) ---
app.get('/api/analytics/view', async (req, res) => {
    try {
        const totalProperties = await Property.countDocuments();
        const totalMessages = await Message.countDocuments(); // Assuming a Message model exists
        const averagePrice = await Property.aggregate([
            { $group: { _id: null, averagePrice: { $avg: '$price' } } }
        ]);

        res.status(200).json({
            totalProperties,
            totalMessages,
            averagePrice: averagePrice[0]?.averagePrice || 0
        });
    } catch (err) {
        console.error('Error fetching analytics:', err.message);
        res.status(500).json({ message: 'Failed to fetch analytics.', error: err.message });
    }
});

// Add a property to bookmarks
app.post('/api/bookmarks', auth, async (req, res) => {
    const { propertyId } = req.body;
    const userId = req.user.id;

    try {
        const existingBookmark = await Bookmark.findOne({ userId, propertyId });
        if (existingBookmark) {
            return res.status(400).json({ message: 'Property already bookmarked.' });
        }

        const bookmark = new Bookmark({ userId, propertyId });
        await bookmark.save();
        res.status(201).json({ message: 'Property bookmarked successfully.' });
    } catch (err) {
        console.error('Error bookmarking property:', err.message);
        res.status(500).json({ message: 'Error bookmarking property.', error: err.message });
    }
});

// Get all bookmarked properties for a user
app.get('/api/bookmarks', auth, async (req, res) => {
    const userId = req.user.id;

    try {
        const bookmarks = await Bookmark.find({ userId }).populate('propertyId');
        res.json(bookmarks.map(bookmark => bookmark.propertyId));
    } catch (err) {
        console.error('Error fetching bookmarks:', err.message);
        res.status(500).json({ message: 'Error fetching bookmarks.', error: err.message });
    }
});

// Remove a property from bookmarks
app.delete('/api/bookmarks/:propertyId', auth, async (req, res) => {
    const userId = req.user.id;
    const { propertyId } = req.params;

    try {
        const bookmark = await Bookmark.findOneAndDelete({ userId, propertyId });
        if (!bookmark) {
            return res.status(404).json({ message: 'Bookmark not found.' });
        }

        res.json({ message: 'Bookmark removed successfully.' });
    } catch (err) {
        console.error('Error removing bookmark:', err.message);
        res.status(500).json({ message: 'Error removing bookmark.', error: err.message });
    }
});

// --- Feedback submission route ---
app.post('/api/feedback', async (req, res) => {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
        return res.status(400).json({ message: 'All fields are required.' });
    }
    try {
        const feedback = new Feedback({ name, email, message });
        await feedback.save();
        res.status(201).json({ message: 'Feedback submitted successfully!' });
    } catch (err) {
        console.error('Error saving feedback:', err.message);
        res.status(500).json({ message: 'Error saving feedback.', error: err.message });
    }
});

// Admin route to get all feedback
app.get('/api/admin/feedback', async (req, res) => {
    try {
        const feedback = await Feedback.find(); // Fetch all feedback from the database
        res.status(200).json(feedback);
    } catch (err) {
        console.error('Error fetching feedback:', err.message);
        res.status(500).json({ message: 'Error fetching feedback.', error: err.message });
    }
});

// --- Start Server ---
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));