const User = require("../models/User");

const formatUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt,
});

// @desc    Dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
const getStats = async (req, res) => {
  const [totalUsers, activeUsers, admins] = await Promise.all([
    User.countDocuments({ role: "user" }),
    User.countDocuments({ role: "user", isActive: true }),
    User.countDocuments({ role: "admin" }),
  ]);

  res.json({
    success: true,
    data: {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      admins,
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
    return res.status(400).json({ success: false, message: "Cannot modify admin status this way" });
  }

  user.isActive = typeof req.body.isActive === "boolean" ? req.body.isActive : !user.isActive;
  await user.save();

  res.json({
    success: true,
    data: formatUser(user),
  });
};

module.exports = { getStats, getUsers, updateUserStatus };

