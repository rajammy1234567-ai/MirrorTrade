/**
 * models/Transaction.js
 * ----------------------------------------------------
 * Every single payout (profit share, same-level bonus,
 * global bonus) MUST be logged here — never just update
 * walletBalance directly without a corresponding record.
 * This is your audit trail — you will need it for disputes,
 * accounting, and (if ever asked) regulatory scrutiny.
 * ----------------------------------------------------
 */

const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    type: {
      type: String,
      enum: [
        "DEPOSIT",
        "T_VIP_PROFIT_SHARE",
        "SAME_LEVEL_BONUS",
        "GLOBAL_DEV_BONUS",
        "REFERRAL_REWARD",
        "WITHDRAWAL",
      ],
      required: true,
    },

    amount: { type: Number, required: true },

    // For bonus types, store which downline user triggered this payout
    sourceUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    // Snapshot of the rank at time of calculation — ranks can change later,
    // but the historical record should never change.
    rankAtTime: { type: String, default: null },
    percentApplied: { type: Number, default: null },

    note: { type: String, default: "" },

    // Razorpay / payment audit (optional — set for gateway deposits)
    paymentRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },
    razorpayPaymentId: { type: String, default: null },
    razorpayOrderId: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
