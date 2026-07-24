const DepositRequest = require("../models/DepositRequest");
const WithdrawRequest = require("../models/WithdrawRequest");
const wallet = require("../services/walletService");

// GET /api/wallet
const getWallet = async (req, res) => {
  try {
    const data = await wallet.snapshotWallet(req.user._id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to load wallet",
    });
  }
};

// GET /api/wallet/deposit-info  — BNB QR + rates
const getDepositInfo = async (_req, res) => {
  res.json({ success: true, data: wallet.getDepositInfo() });
};

// POST /api/wallet/deposit  — create BNB deposit request
// body: { amountUsdt, amountBnb?, txHash? }
const createDeposit = async (req, res) => {
  try {
    const result = await wallet.createDepositRequest({
      userId: req.user._id,
      amountUsdt: req.body.amountUsdt ?? req.body.amount,
      amountBnb: req.body.amountBnb,
      txHash: req.body.txHash,
    });
    res.status(201).json({
      success: true,
      message: result.autoCredited
        ? "Deposit credited to your USDT balance"
        : "Deposit request submitted. Waiting for confirmation.",
      data: result,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Deposit failed",
    });
  }
};

// GET /api/wallet/deposits
const listMyDeposits = async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
  const rows = await DepositRequest.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(limit);
  res.json({
    success: true,
    count: rows.length,
    data: rows.map(wallet.formatDeposit),
  });
};

// POST /api/wallet/purchase-level
// body: { rank?: "T-VIP-1", amount?: number }
const purchaseLevel = async (req, res) => {
  try {
    const data = await wallet.purchaseLevel({
      userId: req.user._id,
      rank: req.body.rank || null,
      amount: req.body.amount != null ? Number(req.body.amount) : null,
    });
    res.json({
      success: true,
      message: `Level capital purchased · $${data.purchased} USDT. T-VIP: ${data.tVip} · C-VIP: ${data.cVip}`,
      data,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Purchase failed",
    });
  }
};

// GET /api/wallet/withdrawable — earnings only
const getWithdrawable = async (req, res) => {
  try {
    const snap = await wallet.snapshotWallet(req.user._id);
    res.json({
      success: true,
      data: {
        withdrawable: snap.withdrawable,
        earningsBalance: snap.earningsBalance,
        walletBalance: snap.walletBalance,
        usdtBalance: snap.usdtBalance,
        note:
          "Only app earnings (referrals, bonuses, profit share) can be withdrawn. Deposit USDT used for level purchase is not withdrawable.",
        currency: "USD",
        unit: "USDT",
      },
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed",
    });
  }
};

// POST /api/wallet/withdraw
// body: { amount, payoutAddress, network? }
const createWithdraw = async (req, res) => {
  try {
    const result = await wallet.requestWithdraw({
      userId: req.user._id,
      amount: req.body.amount,
      payoutAddress: req.body.payoutAddress || req.body.address,
      network: req.body.network,
    });
    res.status(201).json({
      success: true,
      message: "Withdraw request submitted from earnings balance",
      data: result,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Withdraw failed",
    });
  }
};

// GET /api/wallet/withdrawals
const listMyWithdrawals = async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
  const rows = await WithdrawRequest.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(limit);
  res.json({
    success: true,
    count: rows.length,
    data: rows.map(wallet.formatWithdraw),
  });
};

module.exports = {
  getWallet,
  getDepositInfo,
  createDeposit,
  listMyDeposits,
  purchaseLevel,
  getWithdrawable,
  createWithdraw,
  listMyWithdrawals,
};
