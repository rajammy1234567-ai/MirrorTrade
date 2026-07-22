/**
 * Exchange capital → VIP levels
 * ----------------------------------------------------
 * This app does NOT take deposits/payments.
 * User funds stay on the exchange (deposit/withdraw there).
 * `user.totalDeposit` = snapshot of exchange capital used ONLY
 * for T-VIP / C-VIP level qualification + team business.
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
 * SET exchange capital (not add). Source of truth for VIP levels.
 * @param {object} opts
 * @param {string} opts.userId
 * @param {number} opts.amount - total capital on exchange (USDT equity used for ranks)
 * @param {string} [opts.note]
 * @param {string} [opts.source] - exchange | admin
 * @param {string} [opts.exchange]
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

  const previous = Number(user.totalDeposit || 0);
  const previousCVip = user.cVipRank;
  const delta = amountNum - previous;

  user.totalDeposit = amountNum;
  // map unknown sources to enum
  const src =
    source === "exchange" || source === "admin" || source === "none"
      ? source
      : "admin";
  user.capitalSource = src;
  user.capitalSyncedAt = new Date();
  if (exchange) user.primaryExchange = exchange;
  if (src === "none") user.primaryExchange = null;
  await user.save();

  // Audit only when capital changes meaningfully
  if (Math.abs(delta) >= 0.01) {
    await Transaction.create({
      user: user._id,
      type: "DEPOSIT",
      amount: Math.abs(delta),
      note:
        note ||
        (delta >= 0
          ? `Exchange capital +${amountNum} (was ${previous}) · ${source}`
          : `Exchange capital set to ${amountNum} (was ${previous}) · ${source}`),
    });
  }

  const { tVip, cVip } = await recalculateAndSaveRanks(user);

  // Same-level bonus only when capital increased and user newly hits C-VIP-5+
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
    exchangeCapital: fresh.totalDeposit,
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
 * Legacy additive credit — admin/support only if needed.
 */
async function creditDeposit({ userId, amount, note }) {
  const amountNum = Number(amount);
  if (!amountNum || amountNum <= 0 || Number.isNaN(amountNum)) {
    throw new Error("Valid amount is required");
  }
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  const next = Number(user.totalDeposit || 0) + amountNum;
  return setExchangeCapital({
    userId,
    amount: next,
    note: note || `Admin capital credit +${amountNum}`,
    source: "admin",
  });
}

module.exports = {
  setExchangeCapital,
  creditDeposit,
  recalculateUplineChain,
  maybePaySameLevelOnRankUp,
  isCVip5Plus,
};
