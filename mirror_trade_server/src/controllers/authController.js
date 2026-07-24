const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const {
  createUniqueReferralCode,
  validateReferralForSignup,
  createPendingReferral,
  completeVerificationAndRewards,
  normalizePhone,
} = require("../services/referralService");

const formatUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone || null,
  role: user.role,
  isActive: user.isActive,
  isEmailVerified: Boolean(user.isEmailVerified),
  isPhoneVerified: Boolean(user.isPhoneVerified),
  verifiedAt: user.verifiedAt || null,
  referralCode: user.referralCode || null,
  referredBy: user.referredBy || null,
  referralRewardsEarned: user.referralRewardsEarned || 0,
  totalDeposit: user.totalDeposit || 0,
  usdtBalance: user.usdtBalance || 0,
  exchangeCapital: user.exchangeCapital || 0,
  capitalSource: user.capitalSource || "none",
  capitalSyncedAt: user.capitalSyncedAt || null,
  primaryExchange: user.primaryExchange || null,
  tVipRank: user.tVipRank || "NONE",
  cVipRank: user.cVipRank || "NONE",
  walletBalance: user.walletBalance || 0,
  createdAt: user.createdAt,
});

/**
 * Shared signup handler for POST /api/auth/register and POST /api/auth/signup.
 * Accepts optional referralCode, phone, deviceId.
 */
const register = async (req, res) => {
  try {
    const { name, email, password, referralCode, phone, deviceId } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email and password",
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const exists = await User.findOne({ email: emailNorm });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    const phoneNorm = normalizePhone(phone);

    // Phone uniqueness when provided
    if (phoneNorm) {
      const phoneTaken = await User.findOne({ phone: phoneNorm });
      if (phoneTaken) {
        return res.status(400).json({
          success: false,
          message: "An account with this phone number already exists",
        });
      }
    }

    // Validate optional referral + fraud checks (self, phone, device, rate limit)
    let referredBy = null;
    let normalizedCode = null;
    if (referralCode && String(referralCode).trim()) {
      const result = await validateReferralForSignup({
        referralCode,
        email: emailNorm,
        phone: phoneNorm,
        deviceId,
      });
      referredBy = result.sponsor?._id || null;
      normalizedCode = result.code;
    }

    const user = await User.create({
      name: String(name).trim(),
      email: emailNorm,
      password,
      phone: phoneNorm,
      deviceId: deviceId ? String(deviceId).trim() : null,
      role: "user",
      referredBy,
      referralCode: await createUniqueReferralCode(name),
      isEmailVerified: false,
      isPhoneVerified: false,
    });

    // Pending referral record (rewards paid on verify)
    if (referredBy && normalizedCode) {
      try {
        await createPendingReferral({
          referrerId: referredBy,
          referredUserId: user._id,
          referralCodeUsed: normalizedCode,
          deviceId,
          phone: phoneNorm,
        });
      } catch (e) {
        // Unique index race — registration still succeeds without double record
        console.warn("createPendingReferral:", e.message);
      }

      // Direct count can move C-VIP even before verify
      try {
        const { recalculateAndSaveRanks } = require("../services/rankCalculator");
        const sponsor = await User.findById(referredBy);
        if (sponsor) await recalculateAndSaveRanks(sponsor);
      } catch {
        // non-fatal
      }
    }

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: formatUser(user),
      message: referredBy
        ? "Account created. Verify email/phone to unlock referral rewards."
        : "Account created successfully.",
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({
      success: false,
      message: error.message || "Registration failed",
    });
  }
};

// Alias for clients that call /signup
const signup = register;

// @desc    Login (client or admin)
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  const { email, password, deviceId } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Please provide email and password" });
  }

  const user = await User.findOne({ email: String(email).trim().toLowerCase() }).select(
    "+password"
  );

  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  if (!user.isActive) {
    return res.status(403).json({ success: false, message: "Account is deactivated" });
  }

  // Backfill referral code for older accounts
  if (!user.referralCode) {
    user.referralCode = await createUniqueReferralCode(user.name);
    await user.save();
  }

  // Optionally refresh device fingerprint
  if (deviceId && String(deviceId).trim() && user.deviceId !== String(deviceId).trim()) {
    user.deviceId = String(deviceId).trim();
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
  if (!req.user.referralCode) {
    req.user.referralCode = await createUniqueReferralCode(req.user.name);
    await req.user.save();
  }

  res.json({
    success: true,
    user: formatUser(req.user),
  });
};

/**
 * @desc    Mark user verified (email / phone / demo) and pay referral rewards once.
 * @route   POST /api/auth/verify
 * @access  Private
 *
 * Body:
 *  - channel: "email" | "phone" | "both" | "demo" (default "demo")
 *  - code: optional OTP string (demo accepts any 6 digits or "123456")
 *
 * Production: swap demo OTP check for Twilio Verify / Firebase Auth token validation.
 */
const verify = async (req, res) => {
  try {
    const channel = (req.body.channel || "demo").toLowerCase();
    const code = req.body.code != null ? String(req.body.code).trim() : "";

    // Demo OTP gate — replace with real OTP provider in production
    if (channel !== "demo" && code) {
      const ok =
        code.length >= 4 &&
        (/^\d{4,8}$/.test(code) || code === "123456");
      if (!ok) {
        return res.status(400).json({
          success: false,
          message: "Invalid verification code",
        });
      }
    } else if (channel === "demo" || !code) {
      // For demo flow from TwoFA screen: any 6-digit code is fine when sent;
      // also allow empty code only for channel "demo"
      if (code && !/^\d{4,8}$/.test(code) && code !== "123456") {
        return res.status(400).json({
          success: false,
          message: "Invalid verification code",
        });
      }
    }

    const result = await completeVerificationAndRewards(req.user, channel);

    res.json({
      success: true,
      message: result.rewardsCredited
        ? `Verified! You and your referrer each received ₹${result.rewardAmount}.`
        : "Account verified successfully.",
      rewardsCredited: result.rewardsCredited,
      rewardAmount: result.rewardAmount,
      user: formatUser(result.user),
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({
      success: false,
      message: error.message || "Verification failed",
    });
  }
};

module.exports = { register, signup, login, getMe, verify, formatUser };
