const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const authRoutes = require('./routes/auth.routes');
const consultationRoutes = require('./routes/consultation.routes');
const paymentRoutes = require('./routes/payment.routes');
const { initializeSocket } = require('./services/socket.service');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/docta', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error(err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/payments', paymentRoutes);

// Initialize WebSocket
initializeSocket(server);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  pin: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['patient', 'doctor'], default: 'patient' },
  fcmToken: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Hash pin before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('pin')) return next();
  this.pin = await bcrypt.hash(this.pin, 10);
  next();
});

module.exports = mongoose.model('User', UserSchema);
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  pin: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['patient', 'doctor'], default: 'patient' },
  fcmToken: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Hash pin before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('pin')) return next();
  this.pin = await bcrypt.hash(this.pin, 10);
  next();
});

module.exports = mongoose.model('User', UserSchema);
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

exports.register = async (req, res) => {
  try {
    const { phone, pin, name } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ message: 'Phone number already registered' });
    }

    // Create new user
    const user = new User({ phone, pin, name });
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, user: { id: user._id, name: user.name, phone: user.phone } });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { phone, pin } = req.body;
    const user = await User.findOne({ phone });
    
    if (!user || !(await user.comparePin(pin))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: user._id, name: user.name, phone: user.phone } });
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
};
