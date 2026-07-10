const express = require("express");
const authRoutes = require("./authRoutes");
const adminRoutes = require("./adminRoutes");

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "MirrorTrade API is running",
    timestamp: new Date().toISOString(),
  });
});

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);

module.exports = router;
