const copyTrade = require("../services/copyTradeService");

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

module.exports = {
  listTraders,
  getTrader,
  startCopy,
  stopCopy,
  myCopies,
  myPositions,
  closePosition,
  portfolio,
};
