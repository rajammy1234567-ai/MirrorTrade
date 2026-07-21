/**
 * services/teamBusiness.js
 * ----------------------------------------------------
 * Two things this file gives you:
 *  1. countDirects(userId)      -> how many people this user DIRECTLY referred
 *  2. calculateTeamBusiness(id) -> total deposit sum of the ENTIRE downline
 *                                  (direct + indirect, all levels)
 * ----------------------------------------------------
 */

const User = require("../models/User");

/**
 * Count DIRECT referrals only (level 1 downline).
 */
async function countDirects(userId) {
  const count = await User.countDocuments({ referredBy: userId });
  return count;
}

/**
 * Recursively sum totalDeposit of every user in the downline tree,
 * no matter how deep (level 1, level 2, level 3 ... infinite).
 *
 * NOTE: For a large platform (thousands of users), doing this with
 * plain recursion on every request will get slow. Once you have real
 * scale, switch to:
 *   (a) MongoDB's $graphLookup aggregation (single query, DB-side), or
 *   (b) a cached/denormalized "teamBusiness" field on the User doc that
 *       gets incrementally updated whenever anyone in the upline chain
 *       makes a deposit (recommended for production).
 * The recursive version below is fine for getting started / testing logic.
 */
async function calculateTeamBusiness(userId) {
  const directChildren = await User.find({ referredBy: userId }).select(
    "_id totalDeposit"
  );

  let total = 0;

  for (const child of directChildren) {
    total += child.totalDeposit;
    total += await calculateTeamBusiness(child._id); // recurse into their downline
  }

  return total;
}

/**
 * Production-friendly version using $graphLookup — does the entire
 * downline traversal in ONE database query instead of N recursive calls.
 * Use this once you move past prototyping.
 */
async function calculateTeamBusinessFast(userId) {
  const result = await User.aggregate([
    { $match: { _id: userId } },
    {
      $graphLookup: {
        from: "users",
        startWith: "$_id",
        connectFromField: "_id",
        connectToField: "referredBy",
        as: "downline",
      },
    },
    {
      $project: {
        teamBusiness: { $sum: "$downline.totalDeposit" },
      },
    },
  ]);

  return result[0]?.teamBusiness || 0;
}

module.exports = {
  countDirects,
  calculateTeamBusiness,
  calculateTeamBusinessFast,
};
