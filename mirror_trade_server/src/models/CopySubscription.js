/**
 * A user's active (or stopped) copy relationship with a master trader.
 */
const mongoose = require("mongoose");

const copySubscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    trader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trader",
      required: true,
      index: true,
    },
    /** Allocated capital in INR (app denomination) */
    amount: { type: Number, required: true, min: 1 },
    maxDd: { type: Number, required: true, min: 1, max: 100 },
    multiplier: { type: Number, required: true, min: 1, max: 10, default: 1 },
    copyOpen: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ["active", "stopped", "liquidated"],
      default: "active",
      index: true,
    },
    /** Peak equity for drawdown tracking */
    peakEquity: { type: Number, default: 0 },
    /** Current marked equity (cash + open MTM) */
    equity: { type: Number, default: 0 },
    realizedPnl: { type: Number, default: 0 },
    unrealizedPnl: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    stoppedAt: { type: Date, default: null },
    stopReason: { type: String, default: null },
  },
  { timestamps: true }
);

// One active copy per user+trader
copySubscriptionSchema.index(
  { user: 1, trader: 1, status: 1 },
  { partialFilterExpression: { status: "active" } }
);

module.exports = mongoose.model("CopySubscription", copySubscriptionSchema);
