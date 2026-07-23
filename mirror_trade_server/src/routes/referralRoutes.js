const express = require("express");
const { protect } = require("../middleware/auth");
const { getMyCode, getStats } = require("../controllers/referralController");

const router = express.Router();

// GET /api/referrals/my-code  — code + invite link + stats
router.get("/my-code", protect, getMyCode);

// GET /api/referrals/stats    — alias
router.get("/stats", protect, getStats);

module.exports = router;
