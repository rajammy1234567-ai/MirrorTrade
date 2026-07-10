const User = require("../models/User");
const generateToken = require("../utils/generateToken");

const formatUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt,
});

// @desc    Register user (mobile client)
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: "Please provide name, email and password" });
  }

  const exists = await User.findOne({ email });
  if (exists) {
    return res.status(400).json({ success: false, message: "User already exists with this email" });
  }

  const user = await User.create({ name, email, password, role: "user" });
  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    token,
    user: formatUser(user),
  });
};

// @desc    Login (client or admin)
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Please provide email and password" });
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  if (!user.isActive) {
    return res.status(403).json({ success: false, message: "Account is deactivated" });
  }

  const token = generateToken(user._id);

  res.json({
    success: true,
    token,
    user: formatUser(user),
  });
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  res.json({
    success: true,
    user: formatUser(req.user),
  });
};

module.exports = { register, login, getMe };
