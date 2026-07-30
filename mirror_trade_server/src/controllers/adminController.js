const User = require("../models/User");
const DepositRequest = require("../models/DepositRequest");
const WithdrawRequest = require("../models/WithdrawRequest");
const {
  creditDeposit,
  setVipCapital,
} = require("../services/capitalService");
const walletService = require("../services/walletService");
const { createUniqueReferralCode } = require("../services/referralService");

const formatUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone || null,
  role: user.role,
  isActive: user.isActive,
  isEmailVerified: Boolean(user.isEmailVerified),
  referralCode: user.referralCode || null,
  totalDeposit: user.totalDeposit || 0,
  usdtBalance: user.usdtBalance || 0,
  exchangeCapital: user.exchangeCapital || 0,
  capitalSource: user.capitalSource || "none",
  capitalSyncedAt: user.capitalSyncedAt || null,
  primaryExchange: user.primaryExchange || null,
  tVipRank: user.tVipRank || "NONE",
  cVipRank: user.cVipRank || "NONE",
  walletBalance: user.walletBalance || 0,
  referralRewardsEarned: user.referralRewardsEarned || 0,
  createdAt: user.createdAt,
});

// @desc    Dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
const getStats = async (req, res) => {
  const [
    totalUsers,
    activeUsers,
    admins,
    walletAgg,
    pendingDeposits,
    creditedDeposits,
    pendingWithdrawals,
    paidWithdrawals,
    pendingDepositVolume,
    pendingWithdrawVolume,
  ] = await Promise.all([
    User.countDocuments({ role: "user" }),
    User.countDocuments({ role: "user", isActive: true }),
    User.countDocuments({ role: "admin" }),
    User.aggregate([
      { $match: { role: "user" } },
      {
        $group: {
          _id: null,
          totalLevelCapital: { $sum: "$totalDeposit" },
          totalUsdtBalance: { $sum: "$usdtBalance" },
          totalEarnings: { $sum: "$walletBalance" },
          totalExchangeCapital: { $sum: "$exchangeCapital" },
        },
      },
    ]),
    DepositRequest.countDocuments({ status: "pending" }),
    DepositRequest.countDocuments({ status: "credited" }),
    WithdrawRequest.countDocuments({ status: "pending" }),
    WithdrawRequest.countDocuments({ status: "paid" }),
    DepositRequest.aggregate([
      { $match: { status: "pending" } },
      { $group: { _id: null, total: { $sum: "$amountUsdt" } } },
    ]),
    WithdrawRequest.aggregate([
      { $match: { status: "pending" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  const agg = walletAgg[0] || {};

  res.json({
    success: true,
    data: {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      admins,
      /** Legacy alias — level capital (VIP purchases), USD */
      totalDeposits: agg.totalLevelCapital || 0,
      totalLevelCapital: agg.totalLevelCapital || 0,
      totalUsdtBalance: agg.totalUsdtBalance || 0,
      totalEarnings: agg.totalEarnings || 0,
      totalExchangeCapital: agg.totalExchangeCapital || 0,
      pendingDeposits,
      creditedDeposits,
      pendingWithdrawals,
      paidWithdrawals,
      pendingDepositVolume: pendingDepositVolume[0]?.total || 0,
      pendingWithdrawVolume: pendingWithdrawVolume[0]?.total || 0,
      currency: "USD",
      unit: "USDT",
    },
  });
};

// @desc    List users (paginated + optional search)
// @route   GET /api/admin/users?page=1&limit=50&q=
// @access  Private/Admin
const getUsers = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
  const skip = (page - 1) * limit;
  const q = (req.query.q || req.query.search || "").toString().trim();

  const filter = {};
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [
      { name: rx },
      { email: rx },
      { phone: rx },
      { referralCode: rx },
    ];
  }
  if (req.query.role === "user" || req.query.role === "admin") {
    filter.role = req.query.role;
  }
  if (req.query.isActive === "true") filter.isActive = true;
  if (req.query.isActive === "false") filter.isActive = false;

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    count: users.length,
    total,
    page,
    pages: Math.ceil(total / limit) || 1,
    data: users.map(formatUser),
  });
};

// @desc    Toggle user active status
// @route   PATCH /api/admin/users/:id/status
// @access  Private/Admin
const updateUserStatus = async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  if (user.role === "admin") {
    return res
      .status(400)
      .json({ success: false, message: "Cannot modify admin status this way" });
  }

  user.isActive =
    typeof req.body.isActive === "boolean" ? req.body.isActive : !user.isActive;
  await user.save();

  res.json({
    success: true,
    data: formatUser(user),
  });
};

// @desc    Admin sets / adjusts VIP level capital (support only)
// @route   POST /api/admin/users/:id/deposit
// body: { amount, mode?: "set" | "add", kind?: "vip" | "usdt" }
// @access  Private/Admin
const adminDeposit = async (req, res) => {
  const amount = Number(req.body.amount);
  const mode = req.body.mode === "add" ? "add" : "set";
  const kind = req.body.kind === "usdt" ? "usdt" : "vip";

  if (amount < 0 || Number.isNaN(amount)) {
    return res
      .status(400)
      .json({ success: false, message: "Valid amount is required" });
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  if (!user.referralCode) {
    user.referralCode = await createUniqueReferralCode(user.name);
    await user.save();
  }

  try {
    // Credit spendable USDT deposit balance
    if (kind === "usdt") {
      if (mode === "add") {
        await walletService.creditUsdtDeposit({
          userId: user._id,
          amountUsdt: amount,
          note: `Admin USDT credit +${amount}`,
        });
      } else {
        user.usdtBalance = amount;
        await user.save();
      }
      const fresh = await User.findById(user._id);
      return res.status(201).json({
        success: true,
        message: "USDT balance updated",
        data: formatUser(fresh),
      });
    }

    const result =
      mode === "add"
        ? await creditDeposit({
            userId: user._id,
            amount,
            note: `Admin VIP capital credit +${amount}`,
          })
        : await setVipCapital({
            userId: user._id,
            amount,
            source: "admin",
            note: `Admin set VIP capital to ${amount}`,
          });

    const fresh = await User.findById(user._id);

    res.status(201).json({
      success: true,
      message: "VIP capital updated and ranks recalculated",
      data: formatUser(fresh),
      ranks: { tVip: result.tVip, cVip: result.cVip },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// GET /api/admin/deposits?status=pending
const listDeposits = async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const rows = await DepositRequest.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .populate("user", "name email");
  res.json({
    success: true,
    count: rows.length,
    data: rows.map((d) => ({
      ...walletService.formatDeposit(d),
      user: d.user
        ? { id: d.user._id, name: d.user.name, email: d.user.email }
        : null,
    })),
  });
};

// POST /api/admin/deposits/:id/approve
const approveDeposit = async (req, res) => {
  try {
    const result = await walletService.approveDepositRequest({
      depositId: req.params.id,
      adminId: req.user._id,
      note: req.body.note || "",
    });
    res.json({
      success: true,
      message: "Deposit credited as USDT",
      data: result,
    });
  } catch (err) {
    res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
    });
  }
};

// POST /api/admin/deposits/:id/reject
const rejectDeposit = async (req, res) => {
  try {
    const data = await walletService.rejectDepositRequest({
      depositId: req.params.id,
      adminId: req.user._id,
      note: req.body.note || "",
    });
    res.json({ success: true, message: "Deposit rejected", data });
  } catch (err) {
    res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
    });
  }
};

// GET /api/admin/withdrawals
const listWithdrawals = async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const rows = await WithdrawRequest.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .populate("user", "name email");
  res.json({
    success: true,
    count: rows.length,
    data: rows.map((w) => ({
      ...walletService.formatWithdraw(w),
      user: w.user
        ? { id: w.user._id, name: w.user.name, email: w.user.email }
        : null,
    })),
  });
};

// POST /api/admin/withdrawals/:id/pay
const payWithdrawal = async (req, res) => {
  try {
    const data = await walletService.markWithdrawPaid({
      withdrawId: req.params.id,
      adminId: req.user._id,
      txHash: req.body.txHash || req.body.txHashParam || null,
      note: req.body.note || "",
    });
    res.json({ success: true, message: "Withdrawal marked paid", data });
  } catch (err) {
    res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
    });
  }
};

// POST /api/admin/withdrawals/:id/reject
const rejectWithdrawal = async (req, res) => {
  try {
    const data = await walletService.rejectWithdraw({
      withdrawId: req.params.id,
      adminId: req.user._id,
      note: req.body.note || "",
    });
    res.json({
      success: true,
      message: "Withdrawal rejected — earnings refunded",
      data,
    });
  } catch (err) {
    res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
    });
  }
};

// POST /api/admin/signals
const createSignal = async (req, res) => {
  try {
    const data = await signalService.createSignal(req.body);
    res.status(201).json({ success: true, message: "Signal published", data });
  } catch (err) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

// DELETE /api/admin/signals/:id
const deleteSignal = async (req, res) => {
  try {
    const data = await signalService.deleteSignal(req.params.id);
    res.json({ success: true, message: "Signal deactivated", data });
  } catch (err) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

// POST /api/admin/traders
const createTrader = async (req, res) => {
  try {
    const data = await copyTradeService.createTrader(req.body);
    res.status(201).json({ success: true, message: "Trader profile created", data });
  } catch (err) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

// DELETE /api/admin/traders/:id
const deleteTrader = async (req, res) => {
  try {
    const data = await copyTradeService.deleteTrader(req.params.id);
    res.json({ success: true, message: "Trader removed", data });
  } catch (err) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

module.exports = {
  getStats,
  getUsers,
  updateUserStatus,
  adminDeposit,
  listDeposits,
  approveDeposit,
  rejectDeposit,
  listWithdrawals,
  payWithdrawal,
  rejectWithdrawal,
  createSignal,
  deleteSignal,
  createTrader,
  deleteTrader,
};
