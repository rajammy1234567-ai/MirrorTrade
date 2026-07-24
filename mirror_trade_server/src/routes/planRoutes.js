const express = require("express");
const {
  getPlans,
  getMyPlanStatus,
  getMyTransactions,
  purchasePlan,
  recordDeposit,
} = require("../controllers/planController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.get("/", getPlans);
router.get("/me", protect, getMyPlanStatus);
router.get("/transactions", protect, getMyTransactions);
router.post("/purchase", protect, purchasePlan);
router.post("/deposit", protect, recordDeposit);

module.exports = router;
