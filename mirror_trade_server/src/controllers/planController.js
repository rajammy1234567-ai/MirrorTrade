const User = require("../models/User");
const Transaction = require("../models/Transaction");
const {
  T_VIP_RANKS,
  C_VIP_RANKS,
  SAME_LEVEL_BONUS,
  GLOBAL_DEV_RANK_BONUS,
  COMPANY_MARGIN_PERCENT,
  DISTRIBUTION_POOL_PERCENT,
} = require("../config/ranks");
const {
  calculateTVipRank,
  recalculateAndSaveRanks,
} = require("../services/rankCalculator");
const { countDirects, calculateTeamBusiness } = require("../services/teamBusiness");
const { recalculateUplineChain } = require("../services/capitalService");

// @desc    Public plan tables (T-VIP + C-VIP only)
// @route   GET /api/plans
// @access  Public
const getPlans = async (_req, res) => {
  res.json({
    success: true,
    data: {
      tVip: T_VIP_RANKS,
      cVip: C_VIP_RANKS,
      bonuses: {
        sameLevelBonus: SAME_LEVEL_BONUS,
        globalDevRankBonus: GLOBAL_DEV_RANK_BONUS,
      },
      company: {
        companyMarginPercent: COMPANY_MARGIN_PERCENT,
        distributionPoolPercent: DISTRIBUTION_POOL_PERCENT,
      },
    },
  });
};

// @desc    Current user's rank status + progress
// @route   GET /api/plans/me
// @access  Private
const getMyPlanStatus = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  // Ensure referral code exists for older accounts
  if (!user.referralCode) {
    const {
      createUniqueReferralCode,
    } = require("../services/referralService");
    user.referralCode = await createUniqueReferralCode(user.name);
    await user.save();
  }

  // Always recalculate so UI reflects live team/deposit state
  const { tVip, cVip } = await recalculateAndSaveRanks(user);
  const directs = cVip._stats?.directs ?? (await countDirects(user._id));
  const teamBusiness =
    cVip._stats?.teamBusiness ?? (await calculateTeamBusiness(user._id));

  // Next ranks for progress UI
  const nextTVip =
    T_VIP_RANKS.find((r) => r.minDeposit > user.totalDeposit) || null;
  const nextCVip =
    C_VIP_RANKS.find(
      (r) =>
        user.totalDeposit < r.minDeposit ||
        directs < r.minDirects ||
        teamBusiness < r.minTeamBusiness
    ) || null;

  // Progress helpers for client UI
  const tVipProgress = nextTVip
    ? {
        current: user.totalDeposit,
        target: nextTVip.minDeposit,
        percent: Math.min(
          100,
          Math.round((user.totalDeposit / nextTVip.minDeposit) * 100)
        ),
      }
    : { current: user.totalDeposit, target: user.totalDeposit, percent: 100 };

  const cVipProgress = nextCVip
    ? {
        deposit: {
          current: user.totalDeposit,
          target: nextCVip.minDeposit,
          met: user.totalDeposit >= nextCVip.minDeposit,
          percent: Math.min(
            100,
            Math.round(
              (user.totalDeposit / Math.max(nextCVip.minDeposit, 1)) * 100
            )
          ),
        },
        directs: {
          current: directs,
          target: nextCVip.minDirects,
          met: directs >= nextCVip.minDirects,
          percent:
            nextCVip.minDirects === 0
              ? 100
              : Math.min(
                  100,
                  Math.round((directs / nextCVip.minDirects) * 100)
                ),
        },
        teamBusiness: {
          current: teamBusiness,
          target: nextCVip.minTeamBusiness,
          met: teamBusiness >= nextCVip.minTeamBusiness,
          percent:
            nextCVip.minTeamBusiness === 0
              ? 100
              : Math.min(
                  100,
                  Math.round(
                    (teamBusiness / nextCVip.minTeamBusiness) * 100
                  )
                ),
        },
      }
    : null;

  res.json({
    success: true,
    data: {
      // exchange capital snapshot for VIP levels (funds stay on exchange)
      totalDeposit: user.totalDeposit,
      exchangeCapital: user.totalDeposit,
      capitalSource: user.capitalSource || "none",
      capitalSyncedAt: user.capitalSyncedAt || null,
      primaryExchange: user.primaryExchange || null,
      walletBalance: user.walletBalance,
      tVipRank: tVip.rank,
      cVipRank: cVip.rank || "NONE",
      tVipProfitSharePercent: tVip.profitSharePercent || 0,
      referralCode: user.referralCode,
      directs,
      teamBusiness,
      nextTVip,
      nextCVip,
      tVipProgress,
      cVipProgress,
      model: {
        inAppPayments: false,
        capitalFromExchange: true,
        note: "Deposit/withdraw on exchange only. App only calculates VIP levels from capital + team.",
      },
      bonuses: {
        sameLevelBonus: SAME_LEVEL_BONUS,
        globalDevRankBonus: GLOBAL_DEV_RANK_BONUS,
      },
      plans: {
        tVip: T_VIP_RANKS,
        cVip: C_VIP_RANKS,
      },
    },
  });
};

// @desc    User payout / deposit history
// @route   GET /api/plans/transactions
// @access  Private
const getMyTransactions = async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
  const txs = await Transaction.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  res.json({
    success: true,
    count: txs.length,
    data: txs.map((t) => ({
      id: t._id,
      type: t.type,
      amount: t.amount,
      rankAtTime: t.rankAtTime,
      percentApplied: t.percentApplied,
      note: t.note,
      createdAt: t.createdAt,
    })),
  });
};

// @desc    DISABLED for users — capital comes from exchange API sync only
// @route   POST /api/plans/deposit
// @access  Private
const recordDeposit = async (_req, res) => {
  return res.status(403).json({
    success: false,
    message:
      "In-app deposits are disabled. Connect your exchange API — VIP levels use exchange capital. Funds stay on the exchange.",
  });
};

module.exports = {
  getPlans,
  getMyPlanStatus,
  getMyTransactions,
  recordDeposit,
  recalculateUplineChain,
};
