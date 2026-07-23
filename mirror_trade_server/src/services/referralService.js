/**
 * services/referralService.js
 * ------------------------------------------------------------
 * Reusable referral helpers:
 *  - unique code generation
 *  - fraud validation at signup
 *  - pending Referral document creation
 *  - reward credit (once) after verification
 * ------------------------------------------------------------
 */
const User = require("../models/User");
const Referral = require("../models/Referral");
const Transaction = require("../models/Transaction");
const generateReferralCode = require("../utils/referralCode");
const { normalizeReferralCode } = require("../utils/referralCode");
const {
  REWARD_AMOUNT,
  MAX_REFERRALS_PER_CODE_PER_DAY,
  INVITE_BASE_URL,
} = require("../config/referral");

/**
 * Create a unique referral code derived from the user's name.
 * Retries on rare collisions.
 */
async function createUniqueReferralCode(name) {
  for (let i = 0; i < 12; i += 1) {
    const code = generateReferralCode(name);
    // eslint-disable-next-line no-await-in-loop
    const exists = await User.findOne({ referralCode: code }).select("_id");
    if (!exists) return code;
  }
  // Last resort: pure random short string (no name)
  return generateReferralCode("");
}

/**
 * Normalize phone for equality checks (digits only, keep leading + country optional).
 */
function normalizePhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/[^\d+]/g, "");
  return digits.length >= 8 ? digits : null;
}

/**
 * Validate a referral code at signup and run fraud checks.
 * Returns { sponsor } or throws an Error with a user-facing message.
 *
 * @param {object} opts
 * @param {string} opts.referralCode
 * @param {string} [opts.email]
 * @param {string} [opts.phone]
 * @param {string} [opts.deviceId]
 */
async function validateReferralForSignup({
  referralCode,
  email,
  phone,
  deviceId,
}) {
  const code = normalizeReferralCode(referralCode);
  if (!code) {
    return { sponsor: null, code: null };
  }

  const sponsor = await User.findOne({ referralCode: code, isActive: true });
  if (!sponsor) {
    const err = new Error("Invalid referral code");
    err.statusCode = 400;
    throw err;
  }

  // --- Self-referral (same email / phone / device as sponsor) ---
  const emailNorm = String(email || "")
    .trim()
    .toLowerCase();
  if (emailNorm && sponsor.email === emailNorm) {
    const err = new Error("You cannot use your own referral code");
    err.statusCode = 400;
    throw err;
  }

  const phoneNorm = normalizePhone(phone);
  if (phoneNorm && sponsor.phone && normalizePhone(sponsor.phone) === phoneNorm) {
    const err = new Error("You cannot use your own referral code");
    err.statusCode = 400;
    throw err;
  }

  if (
    deviceId &&
    sponsor.deviceId &&
    String(deviceId).trim() === String(sponsor.deviceId).trim()
  ) {
    const err = new Error("You cannot use your own referral code");
    err.statusCode = 400;
    throw err;
  }

  // --- Phone already used a referral ---
  if (phoneNorm) {
    const phoneReuse = await Referral.findOne({
      phone: phoneNorm,
      status: { $in: ["pending", "completed"] },
    }).select("_id");
    if (phoneReuse) {
      const err = new Error(
        "This phone number has already been used with a referral"
      );
      err.statusCode = 400;
      throw err;
    }

    // Also block if another User already exists with this phone (farming)
    const existingPhoneUser = await User.findOne({
      phone: phoneNorm,
    }).select("_id");
    if (existingPhoneUser) {
      const err = new Error(
        "An account with this phone number already exists"
      );
      err.statusCode = 400;
      throw err;
    }
  }

  // --- Device already used a referral ---
  if (deviceId && String(deviceId).trim()) {
    const deviceKey = String(deviceId).trim();
    const deviceReuse = await Referral.findOne({
      deviceId: deviceKey,
      status: { $in: ["pending", "completed"] },
    }).select("_id");
    if (deviceReuse) {
      const err = new Error(
        "This device has already been used with a referral code"
      );
      err.statusCode = 400;
      throw err;
    }
  }

  // --- Rate limit: max uses of this code per day ---
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const usedToday = await Referral.countDocuments({
    referralCodeUsed: code,
    createdAt: { $gte: startOfDay },
  });
  if (usedToday >= MAX_REFERRALS_PER_CODE_PER_DAY) {
    const err = new Error(
      "This referral code has reached its daily invite limit. Try again tomorrow."
    );
    err.statusCode = 429;
    throw err;
  }

  return { sponsor, code };
}

/**
 * Create a pending Referral row after successful signup.
 */
async function createPendingReferral({
  referrerId,
  referredUserId,
  referralCodeUsed,
  deviceId,
  phone,
}) {
  return Referral.create({
    referrer: referrerId,
    referredUser: referredUserId,
    referralCodeUsed: normalizeReferralCode(referralCodeUsed),
    status: "pending",
    rewardGiven: false,
    rewardAmount: REWARD_AMOUNT,
    deviceId: deviceId ? String(deviceId).trim() : null,
    phone: normalizePhone(phone),
  });
}

/**
 * Credit wallet + write audit Transaction. Returns updated user doc.
 * Uses atomic $inc so concurrent verifies cannot double-pay the same call path.
 */
async function creditWallet(userId, amount, note, sourceUserId) {
  const user = await User.findByIdAndUpdate(
    userId,
    {
      $inc: {
        walletBalance: amount,
        referralRewardsEarned: amount,
      },
    },
    { new: true }
  );

  if (!user) return null;

  await Transaction.create({
    user: userId,
    type: "REFERRAL_REWARD",
    amount,
    sourceUser: sourceUserId || null,
    note,
  });

  return user;
}

/**
 * Mark verification complete and, if a pending referral exists, pay both sides once.
 *
 * Safe to call multiple times (idempotent via rewardGiven + status).
 *
 * @param {string|object} userIdOrUser - User _id or mongoose doc
 * @param {"email"|"phone"|"both"} channel
 * @returns {{ user, referral, rewardsCredited, rewardAmount }}
 */
async function completeVerificationAndRewards(userIdOrUser, channel = "email") {
  const user =
    typeof userIdOrUser === "object" && userIdOrUser?._id
      ? userIdOrUser
      : await User.findById(userIdOrUser);

  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  if (channel === "phone" || channel === "both") {
    user.isPhoneVerified = true;
  }
  if (channel === "email" || channel === "both" || channel === "demo") {
    user.isEmailVerified = true;
  }
  // Accept any channel as "verified enough" for rewards
  if (!user.verifiedAt) {
    user.verifiedAt = new Date();
  }
  await user.save();

  // Find pending referral for this new user
  const referral = await Referral.findOne({
    referredUser: user._id,
    status: "pending",
    rewardGiven: false,
  });

  if (!referral) {
    return {
      user,
      referral: null,
      rewardsCredited: false,
      rewardAmount: 0,
    };
  }

  // Atomic claim — only one concurrent verify wins
  const claimed = await Referral.findOneAndUpdate(
    {
      _id: referral._id,
      status: "pending",
      rewardGiven: false,
    },
    {
      $set: {
        status: "completed",
        rewardGiven: true,
        completedAt: new Date(),
        rewardAmount: REWARD_AMOUNT,
      },
    },
    { new: true }
  );

  if (!claimed) {
    // Another request already completed rewards
    return {
      user,
      referral: await Referral.findById(referral._id),
      rewardsCredited: false,
      rewardAmount: 0,
    };
  }

  const amount = REWARD_AMOUNT;

  // Credit referred user (new signup)
  await creditWallet(
    user._id,
    amount,
    `Referral welcome bonus (code ${claimed.referralCodeUsed})`,
    claimed.referrer
  );

  // Credit referrer
  await creditWallet(
    claimed.referrer,
    amount,
    `Referral reward for inviting user ${user.email}`,
    user._id
  );

  // Recalculate sponsor C-VIP (directs / team) — non-fatal
  try {
    const { recalculateAndSaveRanks } = require("./rankCalculator");
    const sponsor = await User.findById(claimed.referrer);
    if (sponsor) await recalculateAndSaveRanks(sponsor);
  } catch {
    // ignore rank errors
  }

  const freshUser = await User.findById(user._id);

  return {
    user: freshUser,
    referral: claimed,
    rewardsCredited: true,
    rewardAmount: amount,
  };
}

/**
 * Stats + share payload for the logged-in user.
 */
async function getMyReferralStats(userId) {
  let user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  // Backfill code for legacy accounts
  if (!user.referralCode) {
    user.referralCode = await createUniqueReferralCode(user.name);
    await user.save();
  }

  const [totalInvites, completed, pending, recent] = await Promise.all([
    Referral.countDocuments({ referrer: user._id }),
    Referral.countDocuments({ referrer: user._id, status: "completed" }),
    Referral.countDocuments({ referrer: user._id, status: "pending" }),
    Referral.find({ referrer: user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("referredUser", "name email createdAt isEmailVerified verifiedAt")
      .lean(),
  ]);

  // Sum of rewards this user earned as referrer (completed rows × amount)
  const rewardAgg = await Referral.aggregate([
    {
      $match: {
        referrer: user._id,
        status: "completed",
        rewardGiven: true,
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$rewardAmount" },
        count: { $sum: 1 },
      },
    },
  ]);

  const rewardsFromInvites = rewardAgg[0]?.total || 0;
  const code = user.referralCode;
  const inviteLink = `${INVITE_BASE_URL}?ref=${encodeURIComponent(code)}`;

  return {
    referralCode: code,
    inviteLink,
    rewardPerUser: REWARD_AMOUNT,
    stats: {
      totalInvites,
      completed,
      pending,
      rewardsEarned: rewardsFromInvites,
      /** Includes welcome bonuses received when this user was referred */
      lifetimeReferralWalletCredits: user.referralRewardsEarned || 0,
      walletBalance: user.walletBalance || 0,
    },
    recent: recent.map((r) => ({
      id: r._id,
      status: r.status,
      rewardGiven: r.rewardGiven,
      rewardAmount: r.rewardAmount,
      createdAt: r.createdAt,
      completedAt: r.completedAt,
      referredUser: r.referredUser
        ? {
            id: r.referredUser._id,
            name: r.referredUser.name,
            email: r.referredUser.email,
            verified: Boolean(
              r.referredUser.isEmailVerified || r.referredUser.verifiedAt
            ),
          }
        : null,
    })),
  };
}

module.exports = {
  createUniqueReferralCode,
  validateReferralForSignup,
  createPendingReferral,
  completeVerificationAndRewards,
  getMyReferralStats,
  normalizePhone,
  REWARD_AMOUNT,
  INVITE_BASE_URL,
};
