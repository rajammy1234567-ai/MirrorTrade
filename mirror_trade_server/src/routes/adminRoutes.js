const express = require("express");
const {
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
} = require("../controllers/adminController");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

router.use(protect, adminOnly);

router.get("/stats", getStats);
router.get("/users", getUsers);
router.patch("/users/:id/status", updateUserStatus);
router.post("/users/:id/deposit", adminDeposit);

router.get("/deposits", listDeposits);
router.post("/deposits/:id/approve", approveDeposit);
router.post("/deposits/:id/reject", rejectDeposit);

router.get("/withdrawals", listWithdrawals);
router.post("/withdrawals/:id/pay", payWithdrawal);
router.post("/withdrawals/:id/reject", rejectWithdrawal);

module.exports = router;
