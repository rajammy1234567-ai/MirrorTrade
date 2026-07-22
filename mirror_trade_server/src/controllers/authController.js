const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const generateReferralCode = require("../utils/referralCode");

const formatUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isActive: user.isActive,
  referralCode: user.referralCode || null,
  totalDeposit: user.totalDeposit || 0,
  capitalSource: user.capitalSource || "none",
  capitalSyncedAt: user.capitalSyncedAt || null,
  primaryExchange: user.primaryExchange || null,
  tVipRank: user.tVipRank || "NONE",
  cVipRank: user.cVipRank || "NONE",
  walletBalance: user.walletBalance || 0,
  createdAt: user.createdAt,
});

async function createUniqueReferralCode() {
  let code = generateReferralCode();
  // extremely unlikely, but retry on collision
  for (let i = 0; i < 5; i += 1) {
    const exists = await User.findOne({ referralCode: code });
    if (!exists) return code;
    code = generateReferralCode();
  }
  return generateReferralCode();
}

// @desc    Register user (mobile client)
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  const { name, email, password, referralCode } = req.body;

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Please provide name, email and password" });
  }

  const exists = await User.findOne({ email });
  if (exists) {
    return res
      .status(400)
      .json({ success: false, message: "User already exists with this email" });
  }

  let referredBy = null;
  if (referralCode && String(referralCode).trim()) {
    const sponsor = await User.findOne({
      referralCode: String(referralCode).trim().toUpperCase(),
    });
    if (!sponsor) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid referral code" });
    }
    referredBy = sponsor._id;
  }

  const user = await User.create({
    name,
    email,
    password,
    role: "user",
    referredBy,
    referralCode: await createUniqueReferralCode(),
  });

  // New direct referral can upgrade sponsor's C-VIP (directs count)
  if (referredBy) {
    try {
      const { recalculateAndSaveRanks } = require("../services/rankCalculator");
      const sponsor = await User.findById(referredBy);
      if (sponsor) {
        await recalculateAndSaveRanks(sponsor);
      }
    } catch {
      // non-fatal — registration still succeeds
    }
  }

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
    return res
      .status(400)
      .json({ success: false, message: "Please provide email and password" });
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  if (!user.isActive) {
    return res.status(403).json({ success: false, message: "Account is deactivated" });
  }

  // Backfill referral code for older accounts
  if (!user.referralCode) {
    user.referralCode = await createUniqueReferralCode();
    await user.save();
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
  // Backfill referral code if missing
  if (!req.user.referralCode) {
    req.user.referralCode = await createUniqueReferralCode();
    await req.user.save();
  }

  res.json({
    success: true,
    user: formatUser(req.user),
  });
};

module.exports = { register, login, getMe, formatUser };
