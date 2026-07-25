/**
 * User trading bots (paper book + live market marks).
 * Same pattern as copy trading — no real exchange order routing yet.
 */
const mongoose = require("mongoose");

const botSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    type: { type: String, enum: ["Grid", "DCA"], required: true },
    pair: { type: String, required: true },
    symbol: { type: String, required: true },
    market: { type: String, enum: ["Spot", "Futures"], default: "Spot" },
    side: { type: String, enum: ["long", "short"], default: "long" },
    investment: { type: Number, required: true, min: 50 },
    /** Optional grid config */
    grids: { type: Number, default: null },
    low: { type: Number, default: null },
    high: { type: Number, default: null },
    entry: { type: Number, required: true },
    current: { type: Number, required: true },
    /** Base-asset qty held (paper) */
    position: { type: Number, default: 0 },
    pnl: { type: Number, default: 0 },
    pnlPct: { type: Number, default: 0 },
    unrealizedPnl: { type: Number, default: 0 },
    running: { type: Boolean, default: true },
    stopped: { type: Boolean, default: false },
    stopMode: {
      type: String,
      enum: ["Normally", "Automatically", null],
      default: null,
    },
    stoppedAt: { type: Date, default: null },
    startedAt: { type: Date, default: Date.now },
    lastActiveAt: { type: Date, default: Date.now },
    mode: { type: String, default: "paper" },
  },
  { timestamps: true }
);

botSchema.index({ user: 1, stopped: 1, running: 1 });

module.exports = mongoose.model("Bot", botSchema);
