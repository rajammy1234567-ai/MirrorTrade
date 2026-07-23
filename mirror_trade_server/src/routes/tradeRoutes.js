const express = require("express");
const { protect } = require("../middleware/auth");
const {
  listTraders,
  getTrader,
  startCopy,
  stopCopy,
  myCopies,
  myPositions,
  closePosition,
  portfolio,
} = require("../controllers/tradeController");

const router = express.Router();

// Public catalog
router.get("/traders", listTraders);
router.get("/traders/:id", getTrader);

// Authenticated copy-trade actions
router.post("/copy", protect, startCopy);
router.post("/copy/:id/stop", protect, stopCopy);
router.get("/my-copies", protect, myCopies);
router.get("/positions", protect, myPositions);
router.post("/positions/:id/close", protect, closePosition);
router.get("/portfolio", protect, portfolio);

module.exports = router;
