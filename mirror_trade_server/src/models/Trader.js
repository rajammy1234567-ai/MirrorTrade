/**
 * Master / signal traders that users can copy.
 * Seeded in DB; openLegs drive what gets mirrored on Start Copy.
 */
const mongoose = require("mongoose");

const openLegSchema = new mongoose.Schema(
  {
    pair: { type: String, required: true }, // e.g. BTC/USDT
    symbol: { type: String, required: true }, // e.g. BTCUSDT (exchange symbol)
    side: { type: String, enum: ["long", "short"], required: true },
    /** Weight of allocation within the trader's book (0–1) */
    weight: { type: Number, default: 0.25 },
    /** Entry price snapshot (paper book) */
    entry: { type: Number, required: true },
    openedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const traderSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    handle: { type: String, required: true },
    avatar: { type: String, default: "MT" },
    bio: { type: String, default: "" },
    verified: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    winRate: { type: Number, default: 60 },
    roi30d: { type: Number, default: 0 },
    totalRoi: { type: Number, default: 0 },
    followers: { type: Number, default: 0 },
    copiers: { type: Number, default: 0 },
    risk: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    maxDrawdown: { type: Number, default: 15 },
    avgHold: { type: String, default: "1d" },
    /** Lightweight equity sparkline points */
    equity: { type: [Number], default: [] },
    openLegs: { type: [openLegSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Trader", traderSchema);
