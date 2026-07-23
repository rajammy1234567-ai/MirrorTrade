const express = require("express");
const {
  register,
  signup,
  login,
  getMe,
  verify,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Primary + alias paths (both create account with optional referralCode)
router.post("/register", register);
router.post("/signup", signup);

router.post("/login", login);
router.get("/me", protect, getMe);

// Verify email/phone (demo OTP) → triggers referral rewards once
router.post("/verify", protect, verify);

module.exports = router;
