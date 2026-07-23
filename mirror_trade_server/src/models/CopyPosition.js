/**
 * Mirrored position opened when user copies a trader (paper book, live prices).
 */
const mongoose = require("mongoose");

const copyPositionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CopySubscription",
      required: true,
      index: true,
    },
    trader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trader",
      required: true,
    },
    traderName: { type: String, default: "" },
    pair: { type: String, required: true },
    symbol: { type: String, required: true },
    side: { type: String, enum: ["long", "short"], required: true },
    /** Notional allocated to this leg (INR) */
    notional: { type: Number, required: true },
    entry: { type: Number, required: true },
    current: { type: Number, required: true },
    /** Qty in base asset (notional / entry) for PnL math */
    qty: { type: Number, required: true },
    pnl: { type: Number, default: 0 },
    pnlPct: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
      index: true,
    },
    closedAt: { type: Date, default: null },
    closeReason: { type: String, default: null },
  },
  { timestamps: true }
);

copyPositionSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model("CopyPosition", copyPositionSchema);
