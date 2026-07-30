const express = require("express");
const { body } = require("express-validator");
const {
  register,
  signup,
  login,
  getMe,
  verify,
  forgotPassword,
  resetPassword,
  changePassword,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const { authLimiter, verifyLimiter } = require("../middleware/rateLimit");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

const registerRules = [
  body("name").trim().notEmpty().withMessage("Name is required").isLength({ max: 80 }),
  body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("referralCode").optional({ nullable: true }).trim().isLength({ max: 32 }),
  body("phone").optional({ nullable: true }).trim().isLength({ max: 20 }),
];

const loginRules = [
  body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

// Primary + alias paths (both create account with optional referralCode)
router.post("/register", authLimiter, registerRules, validateRequest, register);
router.post("/signup", authLimiter, registerRules, validateRequest, signup);

router.post("/login", authLimiter, loginRules, validateRequest, login);
router.get("/me", protect, getMe);

// Verify email/phone → triggers referral rewards once
router.post("/verify", protect, verifyLimiter, verify);

// Forgot & Reset Password
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password", authLimiter, resetPassword);

// Change Password (authenticated)
router.post("/change-password", protect, changePassword);

module.exports = router;
