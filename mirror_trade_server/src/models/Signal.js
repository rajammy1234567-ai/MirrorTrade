/**
 * Public signal feed providers publish setups users can execute (paper book).
 */
const mongoose = require("mongoose");

const signalSchema = new mongoose.Schema(
  {
    provider: { type: String, required: true },
    pair: { type: String, required: true },
    symbol: { type: String, required: true },
    direction: { type: String, enum: ["long", "short"], required: true },
    entry: { type: Number, required: true },
    target: { type: Number, required: true },
    stopLoss: { type: Number, required: true },
    isActive: { type: Boolean, default: true, index: true },
    publishedAt: { type: Date, default: Date.now },
    /** Soft unique key for seed upserts */
    slug: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Signal", signalSchema);
