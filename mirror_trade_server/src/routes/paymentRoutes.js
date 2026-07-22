const express = require("express");
const {
  getPaymentConfig,
  createOrder,
  verifyPayment,
  cancelPayment,
  webhook,
  getMyPayments,
} = require("../controllers/paymentController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Public
router.get("/config", getPaymentConfig);
// Webhook — raw body handled in server.js mount (signature verify)
router.post("/webhook", webhook);

// Authenticated
router.post("/create-order", protect, createOrder);
router.post("/verify", protect, verifyPayment);
router.post("/cancel", protect, cancelPayment);
router.get("/mine", protect, getMyPayments);

module.exports = router;
