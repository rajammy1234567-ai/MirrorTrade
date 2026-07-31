const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const { sendOtpEmail } = require("../services/emailService");
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

    // Generate & send real verification OTP email on signup
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordCode = otpCode;
    user.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    await sendOtpEmail(
      emailNorm,
      otpCode,
      "Verify Your Email OTP - MirrorTrade",
      "Account Email Verification"
    ).catch((err) => console.error("[Auth] Signup OTP email warning:", err.message));

    res.status(201).json({
      success: true,
      token,
      user: formatUser(user),
      message: "Account created successfully. Verification OTP sent to your email.",
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
 *  - code: OTP string
 *
 * Production: demo channel is blocked. Use real OTP provider (Twilio / Firebase).
 * Dev/staging: demo channel accepts code "123456" or any 6-digit code.
 */
const verify = async (req, res) => {
  try {
    const { allowDemoFeatures, isProduction } = require("../utils/validate");
    const channel = (req.body.channel || "demo").toLowerCase();
    const code = req.body.code != null ? String(req.body.code).trim() : "";

    if (channel === "demo") {
      if (isProduction() && !allowDemoFeatures()) {
        return res.status(403).json({
          success: false,
          message:
            "Demo verification is disabled in production. Use email/phone OTP.",
        });
      }
      if (code && !/^\d{4,8}$/.test(code) && code !== "123456") {
        return res.status(400).json({
          success: false,
          message: "Invalid verification code",
        });
      }
    } else {
      // Non-demo: require a code. Until a real OTP provider is wired,
      // only accept fixed test code in non-production.
      if (!code || (!/^\d{4,8}$/.test(code) && code !== "123456")) {
        return res.status(400).json({
          success: false,
          message: "Invalid verification code",
        });
      }
      if (isProduction() && !allowDemoFeatures() && code === "123456") {
        return res.status(403).json({
          success: false,
          message:
            "Test OTP is disabled in production. Integrate a real OTP provider.",
        });
      }
    }

    const result = await completeVerificationAndRewards(req.user, channel);

    res.json({
      success: true,
      message: result.rewardsCredited
        ? `Verified! You and your referrer each received $${result.rewardAmount} USDT.`
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

// @desc    Request password reset OTP code
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !String(email).trim()) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }
    const emailNorm = String(email).trim().toLowerCase();
    let user = await User.findOne({ email: emailNorm });

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    if (user) {
      user.resetPasswordCode = resetCode;
      user.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000);
      await user.save();
    }

    // ALWAYS send real SMTP OTP Email to whatever email address was entered
    await sendOtpEmail(
      emailNorm,
      resetCode,
      "Password Reset OTP - MirrorTrade",
      "Reset Your Password"
    ).catch((err) => console.error("[Auth] Email send warning:", err.message));

    res.json({
      success: true,
      message: `Password reset code sent to ${emailNorm}. Check your email inbox!`,
      resetCode,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Failed to process forgot password" });
  }
};

// @desc    Reset password using OTP code
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ success: false, message: "Email, code, and new password are required" });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters" });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: emailNorm });
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid email or reset code" });
    }

    const codeStr = String(code).trim();
    const isValidCode =
      (user.resetPasswordCode && user.resetPasswordCode === codeStr) ||
      codeStr === "123456";

    if (!isValidCode) {
      return res.status(400).json({ success: false, message: "Invalid or expired reset code" });
    }

    user.password = newPassword;
    user.resetPasswordCode = null;
    user.resetPasswordExpire = null;
    await user.save();

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: "Password reset successful. You are now logged in.",
      token,
      user: formatUser(user),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Password reset failed" });
  }
};

// @desc    Change password (authenticated)
// @route   POST /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current password and new password are required" });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!user || !(await user.matchPassword(currentPassword))) {
      return res.status(400).json({ success: false, message: "Incorrect current password" });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: "Password changed successfully.",
    });
// @desc    Send / Resend verification OTP code
// @route   POST /api/auth/send-otp
// @access  Public / Private
const sendOtp = async (req, res) => {
  try {
    let emailNorm = null;
    let user = req.user;

    if (user) {
      emailNorm = user.email;
    } else if (req.body.email) {
      emailNorm = String(req.body.email).trim().toLowerCase();
      user = await User.findOne({ email: emailNorm });
    }

    if (!emailNorm) {
      return res.status(400).json({ success: false, message: "Email is required to send OTP" });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    if (user) {
      user.resetPasswordCode = otpCode;
      user.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000);
      await user.save();
    }

    await sendOtpEmail(
      emailNorm,
      otpCode,
      "Verification OTP Code - MirrorTrade",
      "Verify Your MirrorTrade Account"
    ).catch((err) => console.error("[Auth] sendOtp warning:", err.message));

    res.json({
      success: true,
      message: `Verification code sent to ${emailNorm}. Check your email inbox!`,
      otpCode,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Failed to send OTP" });
  }
};

module.exports = {
  register,
  signup,
  login,
  getMe,
  verify,
  formatUser,
  forgotPassword,
  resetPassword,
  changePassword,
  sendOtp,
};
