const User = require("../models/User");
const {
  creditDeposit,
  setExchangeCapital,
} = require("../services/capitalService");
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
  const [totalUsers, activeUsers, admins, depositAgg] = await Promise.all([
    User.countDocuments({ role: "user" }),
    User.countDocuments({ role: "user", isActive: true }),
    User.countDocuments({ role: "admin" }),
    User.aggregate([
      { $match: { role: "user" } },
      { $group: { _id: null, total: { $sum: "$totalDeposit" } } },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      admins,
      totalDeposits: depositAgg[0]?.total || 0,
    },
  });
};

// @desc    List all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getUsers = async (req, res) => {
  const users = await User.find().select("-password").sort({ createdAt: -1 });

  res.json({
    success: true,
    count: users.length,
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

// @desc    Admin sets / adjusts exchange capital used for VIP levels (support only)
// @route   POST /api/admin/users/:id/deposit
// body: { amount, mode?: "set" | "add" }  default "set"
// @access  Private/Admin
const adminDeposit = async (req, res) => {
  const amount = Number(req.body.amount);
  const mode = req.body.mode === "add" ? "add" : "set";

  if (amount < 0 || Number.isNaN(amount)) {
    return res
      .status(400)
      .json({ success: false, message: "Valid capital amount is required" });
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
    const result =
      mode === "add"
        ? await creditDeposit({
            userId: user._id,
            amount,
            note: `Admin capital credit +${amount}`,
          })
        : await setExchangeCapital({
            userId: user._id,
            amount,
            source: "admin",
            note: `Admin set capital to ${amount}`,
          });

    const fresh = await User.findById(user._id);

    res.status(201).json({
      success: true,
      message: "Capital updated and VIP ranks recalculated",
      data: formatUser(fresh),
      ranks: { tVip: result.tVip, cVip: result.cVip },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = { getStats, getUsers, updateUserStatus, adminDeposit };
