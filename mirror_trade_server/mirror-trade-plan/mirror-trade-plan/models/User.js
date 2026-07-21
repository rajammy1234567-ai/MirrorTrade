/**
 * models/User.js
 * ----------------------------------------------------
 * Core user schema. Referral tree is modeled with a
 * simple `referredBy` pointer (the classic MLM pattern):
 * each user points to ONE parent (the person who referred them).
 * The whole downline tree is then found by walking this
 * pointer in reverse (see services/teamBusiness.js).
 * ----------------------------------------------------
 */

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },

    // Referral tree
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    referralCode: { type: String, required: true, unique: true }, // this user's own code to share

    // Deposits — total amount user has personally deposited (confirmed only)
    totalDeposit: { type: Number, default: 0 },

    // Cached ranks — recalculated whenever deposit or team changes
    // (see services/rankCalculator.js). Cache avoids recalculating
    // on every single read.
    tVipRank: { type: String, default: "NONE" },
    cVipRank: { type: String, default: "NONE" },

    // Wallet — where computed bonuses/profit actually get credited
    walletBalance: { type: Number, default: 0 },

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Index to make downline lookups fast
userSchema.index({ referredBy: 1 });

module.exports = mongoose.model("User", userSchema);
