const express = require("express");
const router = express.Router();

// Dummy endpoint for copy trading
// @route   POST /api/trade/copy
// @access  Public (should be Private in production)
router.post("/copy", (req, res) => {
  const { traderId, amount, maxDd, multiplier, copyOpen } = req.body;

  if (!traderId || !amount) {
    return res.status(400).json({
      success: false,
      message: "Trader ID and amount are required",
    });
  }

  // Simulate some backend processing time
  setTimeout(() => {
    res.json({
      success: true,
      message: "Copy trading started successfully via Dummy API",
      data: {
        traderId,
        amount,
        maxDd,
        multiplier,
        copyOpen,
        startedAt: new Date().toISOString(),
        dummyOrderId: "ORD-" + Math.floor(Math.random() * 1000000),
      }
    });
  }, 1000); // 1 second delay to feel like a real API call
});

module.exports = router;
