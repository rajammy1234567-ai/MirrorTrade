/**
 * BNB deposit requests — user pays to company QR, submits amount/txHash.
 * Admin (or auto-credit) finalizes → usdtBalance credit.
 */
const mongoose = require("mongoose");

const depositRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    /** USDT amount user expects to receive after conversion */
    amountUsdt: {
      type: Number,
      required: true,
      min: 0,
    },
    /** Optional: BNB amount user claims they sent */
    amountBnb: {
      type: Number,
      default: null,
    },
    coin: {
      type: String,
      default: "BNB",
    },
    network: {
      type: String,
      default: "BSC (BEP-20)",
    },
    depositAddress: {
      type: String,
      required: true,
    },
    txHash: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "credited", "rejected"],
      default: "pending",
      index: true,
    },
    note: {
      type: String,
      default: "",
    },
    creditedAt: {
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

module.exports = mongoose.model("DepositRequest", depositRequestSchema);
