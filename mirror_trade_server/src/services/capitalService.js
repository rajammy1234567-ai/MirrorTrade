/**
 * Capital services
 * ----------------------------------------------------
 * VIP ranks use `user.totalDeposit` = purchased level capital (USD).
 * Exchange API sync writes `user.exchangeCapital` for trading stats ONLY.
 * Deposit principal lives in `user.usdtBalance` (BNB → USDT).
 * Earnings / withdraw live in `user.walletBalance`.
 * ----------------------------------------------------
 */
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const { recalculateAndSaveRanks } = require("./rankCalculator");
const { paySameLevelBonus } = require("./bonusCalculator");
const { countDirects, calculateTeamBusiness } = require("./teamBusiness");

const CVIP5_PLUS = ["C-VIP-5", "C-VIP-6", "C-VIP-7"];

function isCVip5Plus(rank) {
  return CVIP5_PLUS.includes(rank);
}

async function maybePaySameLevelOnRankUp(userId, previousCVip, newCVip, triggerAmount) {
  if (isCVip5Plus(newCVip) && !isCVip5Plus(previousCVip) && triggerAmount > 0) {
    await paySameLevelBonus(userId, triggerAmount);
  }
}

/**
 * Recalculate ranks for entire upline (team business changed).
 */
async function recalculateUplineChain(startUser, triggerAmount = 0) {
  let currentId = startUser.referredBy;
  const visited = new Set();

  while (currentId) {
    const key = String(currentId);
    if (visited.has(key)) break;
    visited.add(key);

    const upline = await User.findById(currentId);
    if (!upline) break;

    const previousCVip = upline.cVipRank;
    const { cVip } = await recalculateAndSaveRanks(upline);

    if (triggerAmount > 0) {
      await maybePaySameLevelOnRankUp(
        upline._id,
        previousCVip,
        cVip.rank,
        triggerAmount
      );
    }

    currentId = upline.referredBy;
  }
}

/**
 * SET exchange equity snapshot for trading stats (does NOT change VIP ranks).
 */
async function setExchangeCapital({
  userId,
  amount,
  note,
  source = "exchange",
  exchange = null,
}) {
  const amountNum = Math.max(0, Math.round(Number(amount) * 100) / 100);
  if (Number.isNaN(amountNum)) {
    throw new Error("Valid capital amount is required");
  }

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const previous = Number(user.exchangeCapital || 0);

  user.exchangeCapital = amountNum;
  user.capitalSyncedAt = new Date();
  if (exchange) user.primaryExchange = exchange;
  if (source === "none") {
    user.primaryExchange = null;
    user.exchangeCapital = 0;
  }
  await user.save();

  // Optional audit trail (not a VIP deposit)
  if (Math.abs(amountNum - previous) >= 0.01) {
    await Transaction.create({
      user: user._id,
      type: "DEPOSIT",
      amount: Math.abs(amountNum - previous),
      note:
        note ||
        `Exchange stats capital set to ${amountNum} USDT (was ${previous}) · stats only`,
    });
  }

  return {
    previousCapital: previous,
    exchangeCapital: user.exchangeCapital,
    totalDeposit: user.totalDeposit,
    usdtBalance: user.usdtBalance || 0,
    walletBalance: user.walletBalance,
    tVipRank: user.tVipRank,
    cVipRank: user.cVipRank,
    capitalSource: user.capitalSource,
    capitalSyncedAt: user.capitalSyncedAt,
    primaryExchange: user.primaryExchange || null,
  };
}

/**
 * Admin/support: set or add VIP level capital (purchased capital).
 * Prefer wallet purchase-level for users.
 */
async function setVipCapital({
  userId,
  amount,
  note,
  source = "admin",
}) {
  const amountNum = Math.max(0, Math.round(Number(amount) * 100) / 100);
  if (Number.isNaN(amountNum)) {
    throw new Error("Valid capital amount is required");
  }

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const previous = Number(user.totalDeposit || 0);
  const previousCVip = user.cVipRank;
  const delta = amountNum - previous;

  user.totalDeposit = amountNum;
  const src =
    source === "purchase" || source === "admin" || source === "bnb"
      ? source
      : "admin";
  user.capitalSource = src;
  user.capitalSyncedAt = new Date();
  await user.save();

  if (Math.abs(delta) >= 0.01) {
    await Transaction.create({
      user: user._id,
      type: "DEPOSIT",
      amount: Math.abs(delta),
      note:
        note ||
        (delta >= 0
          ? `VIP capital +${amountNum} (was ${previous}) · ${src}`
          : `VIP capital set to ${amountNum} (was ${previous}) · ${src}`),
    });
  }

  const { tVip, cVip } = await recalculateAndSaveRanks(user);

  if (delta > 0) {
    await maybePaySameLevelOnRankUp(user._id, previousCVip, cVip.rank, delta);
  }

  await recalculateUplineChain(user, delta > 0 ? delta : 0);

  const fresh = await User.findById(user._id);
  const directs = await countDirects(fresh._id);
  const teamBusiness = await calculateTeamBusiness(fresh._id);

  return {
    previousCapital: previous,
    totalDeposit: fresh.totalDeposit,
    exchangeCapital: fresh.exchangeCapital || 0,
    usdtBalance: fresh.usdtBalance || 0,
    walletBalance: fresh.walletBalance,
    tVipRank: fresh.tVipRank,
    cVipRank: fresh.cVipRank,
    tVip: tVip.rank,
    cVip: cVip.rank,
    directs,
    teamBusiness,
    capitalSource: fresh.capitalSource,
    capitalSyncedAt: fresh.capitalSyncedAt,
    primaryExchange: fresh.primaryExchange || null,
  };
}

/**
 * Legacy additive VIP capital credit — admin/support.
 */
async function creditDeposit({ userId, amount, note }) {
  const amountNum = Number(amount);
  if (!amountNum || amountNum <= 0 || Number.isNaN(amountNum)) {
    throw new Error("Valid amount is required");
  }
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  const next = Number(user.totalDeposit || 0) + amountNum;
  return setVipCapital({
    userId,
    amount: next,
    note: note || `Admin VIP capital credit +${amountNum}`,
    source: "admin",
  });
}

module.exports = {
  setExchangeCapital,
  setVipCapital,
  creditDeposit,
  recalculateUplineChain,
  maybePaySameLevelOnRankUp,
  isCVip5Plus,
};
