/**
 * controllers/referralController.js
 */
const {
  getMyReferralStats,
} = require("../services/referralService");

// @desc    Logged-in user's referral code, invite link, and stats
// @route   GET /api/referrals/my-code
// @access  Private
const getMyCode = async (req, res) => {
  try {
    const data = await getMyReferralStats(req.user._id);
    res.json({ success: true, data });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({
      success: false,
      message: error.message || "Failed to load referral stats",
    });
  }
};

// @desc    Same stats under /api/referrals/stats (alias)
// @route   GET /api/referrals/stats
// @access  Private
const getStats = getMyCode;

module.exports = { getMyCode, getStats };
