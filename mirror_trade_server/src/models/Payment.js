/**
 * Payment — Razorpay order lifecycle audit.
 * Status flow: created → paid | failed | refunded
 */
const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
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
      min: 1,
    },
    currency: {
      type: String,
      default: "INR",
    },
    /** Amount in paise as sent to Razorpay */
    amountPaise: {
      type: Number,
      required: true,
    },
    purpose: {
      type: String,
      enum: ["deposit"],
      default: "deposit",
    },
    status: {
      type: String,
      enum: ["created", "paid", "failed", "refunded"],
      default: "created",
      index: true,
    },
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
    },
    razorpaySignature: {
      type: String,
      default: null,
    },
    method: {
      type: String,
      default: null,
    },
    receipt: {
      type: String,
      default: null,
    },
    notes: {
      type: Object,
      default: {},
    },
    paidAt: {
      type: Date,
      default: null,
    },
    failureReason: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Prevent double-credit of the same Razorpay payment id
paymentSchema.index(
  { razorpayPaymentId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      razorpayPaymentId: { $type: "string" },
    },
  }
);

module.exports = mongoose.model("Payment", paymentSchema);
