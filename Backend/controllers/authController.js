const User = require('../models/User');
const jwt = require('jsonwebtoken');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  const { username, email, password } = req.body;

  try {
    // Create user
    const user = await User.create({
      username,
      email,
      password,
      balance: 1000 // Explicitly set starting balance to solve bug
    });

    sendTokenResponse(user, 200, res);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  // Validate email & password
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Please provide an email and password' });
  }

  // Check for user
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  // Check if password matches
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  sendTokenResponse(user, 200, res);
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  // req.user is set by the auth middleware
  const user = await User.findById(req.user.id);
  res.status(200).json({
    success: true,
    data: user,
  });
};

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });

  res.status(statusCode).json({
    success: true,
    token,
  });
};
