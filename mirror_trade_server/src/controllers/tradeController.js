const copyTrade = require("../services/copyTradeService");
const botService = require("../services/botService");
const signalService = require("../services/signalService");

// GET /api/trade/traders
const listTraders = async (req, res) => {
  try {
    const sort = req.query.sort || "roi";
    const risk = req.query.risk || undefined;
    const data = await copyTrade.listTraders({ sort, risk });
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to list traders",
    });
  }
};

// GET /api/trade/traders/:id
const getTrader = async (req, res) => {
  try {
    const data = await copyTrade.getTraderById(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Trader not found",
    });
  }
};

// POST /api/trade/copy  (auth)
const startCopy = async (req, res) => {
  try {
    const { traderId, amount, maxDd, multiplier, copyOpen } = req.body;
    if (!traderId) {
      return res
        .status(400)
        .json({ success: false, message: "traderId is required" });
    }
    const data = await copyTrade.startCopy({
      userId: req.user._id,
      traderId,
      amount,
      maxDd: maxDd ?? 20,
      multiplier: multiplier ?? 1,
      copyOpen: copyOpen !== false,
    });
    res.status(201).json({
      success: true,
      message: `Now copying ${data.subscription.trader?.name || "trader"}`,
      data,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to start copy",
    });
  }
};

// POST /api/trade/copy/:id/stop  (auth)
const stopCopy = async (req, res) => {
  try {
    const data = await copyTrade.stopCopy({
      userId: req.user._id,
      subscriptionId: req.params.id,
    });
    res.json({ success: true, message: "Copy stopped", data });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to stop copy",
    });
  }
};

// GET /api/trade/my-copies  (auth)
const myCopies = async (req, res) => {
  try {
    const data = await copyTrade.listMySubscriptions(req.user._id);
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to load copies",
    });
  }
};

// GET /api/trade/positions  (auth) ?status=active|closed|all
const myPositions = async (req, res) => {
  try {
    const status = req.query.status || "active";
    const data = await copyTrade.listMyPositions(req.user._id, { status });
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to load positions",
    });
  }
};

// POST /api/trade/positions/:id/close  (auth)
const closePosition = async (req, res) => {
  try {
    const data = await copyTrade.closePosition({
      userId: req.user._id,
      positionId: req.params.id,
    });
    res.json({ success: true, message: "Position closed", data });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to close position",
    });
  }
};

// GET /api/trade/portfolio  (auth)
const portfolio = async (req, res) => {
  try {
    const data = await copyTrade.portfolioSummary(req.user._id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to load portfolio",
    });
  }
};

// ─── Bots (paper) ───────────────────────────────────────────

const listBots = async (req, res) => {
  try {
    const data = await botService.listBots(req.user._id);
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to list bots",
    });
  }
};

const getBot = async (req, res) => {
  try {
    const data = await botService.getBot(req.user._id, req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Bot not found",
    });
  }
};

const createBot = async (req, res) => {
  try {
    const data = await botService.createBot({
      userId: req.user._id,
      type: req.body.type,
      market: req.body.market,
      pair: req.body.pair,
      investment: req.body.investment ?? req.body.amount,
      side: req.body.side,
      grids: req.body.grids,
      low: req.body.low,
      high: req.body.high,
      name: req.body.name,
    });
    res.status(201).json({
      success: true,
      message: `${data.bot.name} launched`,
      data,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create bot",
    });
  }
};

const pauseBot = async (req, res) => {
  try {
    const data = await botService.pauseBot(req.user._id, req.params.id);
    res.json({
      success: true,
      message: data.running ? "Bot resumed" : "Bot paused",
      data,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to pause bot",
    });
  }
};

const stopBot = async (req, res) => {
  try {
    const data = await botService.stopBot(req.user._id, req.params.id);
    res.json({ success: true, message: "Bot stopped", data });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to stop bot",
    });
  }
};

const resumeBot = async (req, res) => {
  try {
    const data = await botService.resumeBot(req.user._id, req.params.id);
    res.json({ success: true, message: "Bot restarted", data });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to resume bot",
    });
  }
};

// ─── Signals ────────────────────────────────────────────────

const listSignals = async (req, res) => {
  try {
    const data = await signalService.listSignals();
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to list signals",
    });
  }
};

const executeSignal = async (req, res) => {
  try {
    const amount = req.body.amount ?? 100;
    const data = await signalService.executeSignal({
      userId: req.user._id,
      signalId: req.params.id,
      amount,
    });
    res.status(201).json({
      success: true,
      message: "Signal executed",
      data,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to execute signal",
    });
  }
};

module.exports = {
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
};
