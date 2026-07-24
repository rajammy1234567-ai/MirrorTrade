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
    /** Optional phone — used for fraud checks + future OTP */
    phone: {
      type: String,
      default: null,
      trim: true,
      unique: true,
      sparse: true,
    },
    /**
     * Stable device fingerprint from the client (AsyncStorage UUID on Expo).
     * Used to block multi-account referral farming on one device.
     */
    deviceId: {
      type: String,
      default: null,
      trim: true,
      index: true,
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
    /** Email verified (demo OTP or real provider later) */
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    /** Phone verified (Twilio / Firebase OTP later) */
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    /** When the user first completed verification */
    verifiedAt: {
      type: Date,
      default: null,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    /** This user's own shareable code (e.g. AM4729) */
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
    },
    /** Lifetime referral rewards credited to this wallet */
    referralRewardsEarned: {
      type: Number,
      default: 0,
    },
    /**
     * VIP level capital (USD/USDT) from level purchases.
     * Drives T-VIP / C-VIP ranks — not exchange balances.
     */
    totalDeposit: {
      type: Number,
      default: 0,
    },
    /**
     * Spendable deposit balance (USDT). Credited when user deposits BNB via QR.
     * Used only to purchase VIP levels — NOT withdrawable.
     */
    usdtBalance: {
      type: Number,
      default: 0,
    },
    /**
     * Snapshot of exchange equity (USDT) for trading stats only.
     * Does NOT affect VIP ranks or withdrawable balance.
     */
    exchangeCapital: {
      type: Number,
      default: 0,
    },
    capitalSource: {
      type: String,
      enum: ["none", "exchange", "admin", "purchase", "bnb"],
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
    /**
     * Platform earnings only (referral / bonuses / profit share).
     * This is the ONLY balance users can withdraw from the app.
     */
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
