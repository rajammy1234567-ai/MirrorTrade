/**
 * services/rankCalculator.js
 * ----------------------------------------------------
 * Given a user's deposit + direct count + team business,
 * figure out which rank (T-VIP and C-VIP) they currently qualify for.
 *
 * IMPORTANT RULE (matches the handwritten/PDF plan):
 * A user gets the HIGHEST rank for which they meet ALL conditions.
 * If they meet deposit for rank 6 but directs for only rank 3,
 * they are capped at rank 3 (the weakest-link rule).
 * ----------------------------------------------------
 */

const { T_VIP_RANKS, C_VIP_RANKS } = require("../config/ranks");
const { countDirects, calculateTeamBusiness } = require("./teamBusiness");

/**
 * T-VIP rank only depends on the user's own deposit.
 */
function calculateTVipRank(totalDeposit) {
  let qualifiedRank = { rank: "NONE", profitSharePercent: 0 };

  // ranks are ordered lowest -> highest, so keep overwriting
  // as long as the deposit qualifies for a higher one
  for (const rankDef of T_VIP_RANKS) {
    if (totalDeposit >= rankDef.minDeposit) {
      qualifiedRank = rankDef;
    }
  }

  return qualifiedRank; // { rank, minDeposit, profitSharePercent }
}

/**
 * C-VIP rank depends on THREE conditions together:
 *   - own deposit
 *   - number of direct referrals
 *   - total team business (downline sum)
 * ALL three must be satisfied for a given rank row.
 */
async function calculateCVipRank(userId, totalDeposit) {
  const directs = await countDirects(userId);
  const teamBusiness = await calculateTeamBusiness(userId);

  let qualifiedRank = { rank: "NONE" };

  for (const rankDef of C_VIP_RANKS) {
    const meetsDeposit = totalDeposit >= rankDef.minDeposit;
    const meetsDirects = directs >= rankDef.minDirects;
    const meetsTeamBusiness = teamBusiness >= rankDef.minTeamBusiness;

    if (meetsDeposit && meetsDirects && meetsTeamBusiness) {
      qualifiedRank = rankDef; // keep climbing as long as all 3 pass
    } else {
      // Once a rank fails, higher ranks (which need even more) will
      // also fail — but we don't break, because table isn't strictly
      // guaranteed monotonic in every field if you edit config later.
      // For the default config this is safe to leave as a full loop.
    }
  }

  return {
    ...qualifiedRank,
    _stats: { directs, teamBusiness }, // useful for debugging / showing user their progress
  };
}

/**
 * Convenience: recalculate + persist both ranks on the User document.
 * Call this after every deposit, and after every downline deposit
 * (since that changes team business for everyone upline).
 */
async function recalculateAndSaveRanks(userDoc) {
  const tVip = calculateTVipRank(userDoc.totalDeposit);
  const cVip = await calculateCVipRank(userDoc._id, userDoc.totalDeposit);

  userDoc.tVipRank = tVip.rank;
  userDoc.cVipRank = cVip.rank;
  await userDoc.save();

  return { tVip, cVip };
}

module.exports = {
  calculateTVipRank,
  calculateCVipRank,
  recalculateAndSaveRanks,
};
