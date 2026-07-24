/**
 * Withdrawals — ONLY from earnings (walletBalance), never from usdtBalance.
 */
const mongoose = require("mongoose");

const withdrawRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "USDT",
    },
    /** User payout address (BNB / USDT BEP-20 etc.) */
    payoutAddress: {
      type: String,
      required: true,
      trim: true,
    },
    network: {
      type: String,
      default: "BSC (BEP-20)",
    },
    status: {
      type: String,
      enum: ["pending", "paid", "rejected"],
      default: "pending",
      index: true,
    },
    note: {
      type: String,
      default: "",
    },
    processedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WithdrawRequest", withdrawRequestSchema);
