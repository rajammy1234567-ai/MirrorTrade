/**
 * models/Referral.js
 * Tracks each invite from signup → verification → reward payout.
 * One document per referred user (unique referredUser).
 */
const mongoose = require("mongoose");

const referralSchema = new mongoose.Schema(
  {
    /** User who shared the code */
    referrer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /** New user who signed up with the code */
    referredUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    /** Snapshot of the code used at signup */
    referralCodeUsed: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    /**
     * pending   – signed up, not yet verified
     * completed – verified + rewards credited
     * rejected  – cancelled / fraud
     */
    status: {
      type: String,
      enum: ["pending", "completed", "rejected"],
      default: "pending",
      index: true,
    },

    /** True once both wallets have been credited (idempotent guard) */
    rewardGiven: {
      type: Boolean,
      default: false,
    },

    /** Amount credited to each side (referrer and referred) */
    rewardAmount: {
      type: Number,
      default: 0,
    },

    /** Fraud-audit fingerprints captured at signup */
    deviceId: {
      type: String,
      default: null,
      index: true,
    },
    phone: {
      type: String,
      default: null,
      index: true,
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Fast "how many invites today for this code" queries
referralSchema.index({ referralCodeUsed: 1, createdAt: -1 });
referralSchema.index({ referrer: 1, status: 1 });

module.exports = mongoose.model("Referral", referralSchema);
