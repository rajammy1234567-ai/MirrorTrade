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
  listBots,
  getBot,
  createBot,
  pauseBot,
  stopBot,
  resumeBot,
  listSignals,
  executeSignal,
} = require("../controllers/tradeController");

const router = express.Router();

// Public catalog
router.get("/traders", listTraders);
router.get("/traders/:id", getTrader);
router.get("/signals", listSignals);

// Authenticated copy-trade actions
router.post("/copy", protect, startCopy);
router.post("/copy/:id/stop", protect, stopCopy);
router.get("/my-copies", protect, myCopies);
router.get("/positions", protect, myPositions);
router.post("/positions/:id/close", protect, closePosition);
router.get("/portfolio", protect, portfolio);

// Paper bots (auth)
router.get("/bots", protect, listBots);
router.post("/bots", protect, createBot);
router.get("/bots/:id", protect, getBot);
router.post("/bots/:id/pause", protect, pauseBot);
router.post("/bots/:id/stop", protect, stopBot);
router.post("/bots/:id/resume", protect, resumeBot);

// Signal execute (auth)
router.post("/signals/:id/execute", protect, executeSignal);

module.exports = router;
