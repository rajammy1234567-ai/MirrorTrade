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
const walletService = require("../services/walletService");

// @desc    Public plan tables (T-VIP + C-VIP only)
// @route   GET /api/plans
// @access  Public
const getPlans = async (_req, res) => {
  res.json({
    success: true,
    data: {
      tVip: T_VIP_RANKS,
      cVip: C_VIP_RANKS,
      currency: "USD",
      unit: "USDT",
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

// @desc    Current user's rank status + wallet snapshot
// @route   GET /api/plans/me
// @access  Private
const getMyPlanStatus = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  if (!user.referralCode) {
    const {
      createUniqueReferralCode,
    } = require("../services/referralService");
    user.referralCode = await createUniqueReferralCode(user.name);
    await user.save();
  }

  const { tVip, cVip } = await recalculateAndSaveRanks(user);
  const directs = cVip._stats?.directs ?? (await countDirects(user._id));
  const teamBusiness =
    cVip._stats?.teamBusiness ?? (await calculateTeamBusiness(user._id));

  const nextTVip =
    T_VIP_RANKS.find((r) => r.minDeposit > user.totalDeposit) || null;
  const nextCVip =
    C_VIP_RANKS.find(
      (r) =>
        user.totalDeposit < r.minDeposit ||
        directs < r.minDirects ||
        teamBusiness < r.minTeamBusiness
    ) || null;

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

  // Purchase prices for each T-VIP rank (cost to reach from current capital)
  const tVipBuyOptions = T_VIP_RANKS.map((r) => ({
    ...r,
    priceToReach: Math.max(
      0,
      Math.round((r.minDeposit - Number(user.totalDeposit || 0)) * 100) / 100
    ),
    unlocked: Number(user.totalDeposit || 0) >= r.minDeposit,
  }));

  res.json({
    success: true,
    data: {
      totalDeposit: user.totalDeposit,
      levelCapital: user.totalDeposit,
      exchangeCapital: user.exchangeCapital || 0,
      usdtBalance: user.usdtBalance || 0,
      depositBalance: user.usdtBalance || 0,
      capitalSource: user.capitalSource || "none",
      capitalSyncedAt: user.capitalSyncedAt || null,
      primaryExchange: user.primaryExchange || null,
      walletBalance: user.walletBalance,
      earningsBalance: user.walletBalance,
      withdrawable: user.walletBalance,
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
      tVipBuyOptions,
      currency: "USD",
      unit: "USDT",
      model: {
        inAppPayments: true,
        depositCoin: "BNB",
        creditCurrency: "USDT",
        capitalFromExchange: false,
        note:
          "Deposit BNB via QR → credited as USDT. Buy VIP levels with USDT. Withdraw only app earnings (referrals/bonuses). Exchange API shows trading stats only.",
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

// @desc    Buy VIP level capital with USDT balance
// @route   POST /api/plans/purchase
// @access  Private
const purchasePlan = async (req, res) => {
  try {
    const data = await walletService.purchaseLevel({
      userId: req.user._id,
      rank: req.body.rank || null,
      amount: req.body.amount != null ? Number(req.body.amount) : null,
    });
    res.json({
      success: true,
      message: `Purchased $${data.purchased} USDT level capital · T-VIP ${data.tVip} · C-VIP ${data.cVip}`,
      data,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Purchase failed",
    });
  }
};

// @desc    Legacy alias — use wallet deposit
// @route   POST /api/plans/deposit
// @access  Private
const recordDeposit = async (req, res) => {
  return res.status(400).json({
    success: false,
    message:
      "Use POST /api/wallet/deposit for BNB deposits. Then POST /api/plans/purchase or /api/wallet/purchase-level to buy VIP levels.",
  });
};

module.exports = {
  getPlans,
  getMyPlanStatus,
  getMyTransactions,
  purchasePlan,
  recordDeposit,
  recalculateUplineChain,
};
