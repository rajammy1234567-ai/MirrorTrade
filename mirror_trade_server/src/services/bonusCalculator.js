/**
 * services/bonusCalculator.js
 * ----------------------------------------------------
 * This is where money actually gets credited. Three payout types:
 *   1. T-VIP profit share  -> user earns % of THEIR OWN exchange profit
 *   2. Same Level Bonus    -> C-VIP-5 earns 10% when a downline hits C-VIP-5
 *   3. Global Dev Bonus    -> earns 20%/40%/60% based on own C-VIP rank
 *
 * SAFETY RULE: total distributed per $ deposited must never exceed
 * DISTRIBUTION_POOL_PERCENT (90%). Always compute against a bounded
 * "profit pool" for a given trade/cycle — never an unbounded loop
 * up the entire upline with no cap, or the platform can pay out more
 * than it takes in.
 * ----------------------------------------------------
 */

const User = require("../models/User");
const Transaction = require("../models/Transaction");
const {
  SAME_LEVEL_BONUS,
  GLOBAL_DEV_RANK_BONUS,
} = require("../config/ranks");
const { calculateTVipRank } = require("./rankCalculator");

/**
 * 1. T-VIP profit share.
 * `tradeProfitPool` = the actual $ profit generated for this user's
 * deposit in a given trading cycle (this number MUST come from real
 * trading results, not be invented — see note at the bottom).
 */
async function payTVipProfitShare(userId, tradeProfitPool) {
  const user = await User.findById(userId);
  const rank = calculateTVipRank(user.totalDeposit);

  if (rank.profitSharePercent === 0) return null;

  const payout = (tradeProfitPool * rank.profitSharePercent) / 100;

  user.walletBalance += payout;
  await user.save();

  await Transaction.create({
    user: user._id,
    type: "T_VIP_PROFIT_SHARE",
    amount: payout,
    rankAtTime: rank.rank,
    percentApplied: rank.profitSharePercent,
    note: `Profit share from trade pool of ${tradeProfitPool}`,
  });

  return payout;
}

/**
 * 2. Same Level Bonus — triggered when a user reaches C-VIP-5.
 * Walk UP the referral chain to find the nearest upline who is
 * ALSO C-VIP-5 (or higher) and pay them 10% of the amount that
 * triggered this (typically the new C-VIP-5's deposit or profit).
 */
async function paySameLevelBonus(newCVip5UserId, triggerAmount) {
  const newUser = await User.findById(newCVip5UserId);
  const qualifies = ["C-VIP-5", "C-VIP-6", "C-VIP-7"].includes(newUser.cVipRank);
  if (!qualifies) {
    return null; // only fires when someone actually reaches C-VIP-5+
  }

  let upline = await User.findById(newUser.referredBy);
  const percent = SAME_LEVEL_BONUS["C-VIP-5"];

  // walk up the chain looking for the first C-VIP-5 (or higher) upline
  while (upline) {
    if (["C-VIP-5", "C-VIP-6", "C-VIP-7"].includes(upline.cVipRank)) {
      const payout = (triggerAmount * percent) / 100;
      upline.walletBalance += payout;
      await upline.save();

      await Transaction.create({
        user: upline._id,
        type: "SAME_LEVEL_BONUS",
        amount: payout,
        sourceUser: newUser._id,
        rankAtTime: upline.cVipRank,
        percentApplied: percent,
        note: `Same level bonus triggered by ${newUser.username} reaching C-VIP-5`,
      });

      return payout;
    }
    upline = await User.findById(upline.referredBy);
  }

  return null; // no qualifying upline found
}

/**
 * 3. Global Development Rank Bonus — based on the EARNER's own C-VIP rank.
 * Fires whenever ANYONE in the earner's downline generates business/profit.
 */
async function payGlobalDevBonus(earnerId, triggerAmount, sourceUserId) {
  const earner = await User.findById(earnerId);
  if (!earner || earner.cVipRank === "NONE") return null;

  const percent =
    GLOBAL_DEV_RANK_BONUS[earner.cVipRank] || GLOBAL_DEV_RANK_BONUS.DEFAULT;

  const payout = (triggerAmount * percent) / 100;

  earner.walletBalance += payout;
  await earner.save();

  await Transaction.create({
    user: earner._id,
    type: "GLOBAL_DEV_BONUS",
    amount: payout,
    sourceUser: sourceUserId,
    rankAtTime: earner.cVipRank,
    percentApplied: percent,
    note: `Global development rank bonus`,
  });

  return payout;
}

module.exports = {
  payTVipProfitShare,
  paySameLevelBonus,
  payGlobalDevBonus,
};

/**
 * IMPORTANT - read before wiring this to real money:
 * `tradeProfitPool` and `triggerAmount` in the functions above are
 * treated as GIVEN inputs. You still need to decide: where does this
 * number actually come from?
 *   - If from real trading gains -> you need a real trading engine/API
 *     feeding real profit numbers in.
 *   - If it's just "10x deposit, guaranteed" with no real trading behind
 *     it -> payouts are funded by newer users' deposits, which is a
 *     Ponzi structure and is illegal in India (and most countries).
 * This code will faithfully execute whatever numbers you feed it —
 * it does not know or care which case it is. That decision is the
 * business's, and it determines whether this platform is legal.
 */
