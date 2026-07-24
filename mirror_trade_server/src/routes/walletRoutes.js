const express = require("express");
const {
  getWallet,
  getDepositInfo,
  createDeposit,
  listMyDeposits,
  purchaseLevel,
  getWithdrawable,
  createWithdraw,
  listMyWithdrawals,
} = require("../controllers/walletController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.get("/", protect, getWallet);
router.get("/deposit-info", protect, getDepositInfo);
router.post("/deposit", protect, createDeposit);
router.get("/deposits", protect, listMyDeposits);
router.post("/purchase-level", protect, purchaseLevel);
router.get("/withdrawable", protect, getWithdrawable);
router.post("/withdraw", protect, createWithdraw);
router.get("/withdrawals", protect, listMyWithdrawals);

module.exports = router;
