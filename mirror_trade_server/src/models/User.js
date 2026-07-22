const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    /**
     * Exchange capital used for VIP levels (NOT in-app wallet deposit).
     * Funds stay on the user's exchange; this is a snapshot for ranks.
     */
    totalDeposit: {
      type: Number,
      default: 0,
    },
    capitalSource: {
      type: String,
      enum: ["none", "exchange", "admin"],
      default: "none",
    },
    capitalSyncedAt: {
      type: Date,
      default: null,
    },
    primaryExchange: {
      type: String,
      default: null,
    },
    tVipRank: {
      type: String,
      default: "NONE",
    },
    cVipRank: {
      type: String,
      default: "NONE",
    },
    /** Platform earnings (bonuses / profit share), not exchange balance */
    walletBalance: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function matchPassword(enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Index to make downline lookups fast
userSchema.index({ referredBy: 1 });

module.exports = mongoose.model("User", userSchema);
