/**
 * config/ranks.js
 * ----------------------------------------------------
 * Single source of truth for the rank tables.
 * Change numbers here ONLY — never hardcode rank values
 * anywhere else in the codebase.
 * ----------------------------------------------------
 */

// ---------- I - VIP (T-VIP) : personal deposit based ----------
// minDeposit = minimum deposit ($) required to qualify for this rank
// profitSharePercent = % of the "exchange profit pool" the user gets
const T_VIP_RANKS = [
  { rank: "DEMO",     minDeposit: 50,   profitSharePercent: 0  },
  { rank: "T-VIP-1",  minDeposit: 100,  profitSharePercent: 20 },
  { rank: "T-VIP-2",  minDeposit: 200,  profitSharePercent: 30 },
  { rank: "T-VIP-3",  minDeposit: 300,  profitSharePercent: 40 },
  { rank: "T-VIP-4",  minDeposit: 400,  profitSharePercent: 50 },
  { rank: "T-VIP-5",  minDeposit: 500,  profitSharePercent: 55 },
  { rank: "T-VIP-6",  minDeposit: 1000, profitSharePercent: 60 },
  { rank: "T-VIP-7",  minDeposit: 2000, profitSharePercent: 65 },
];

// ---------- D - C-VIP : team/referral based ----------
// minDeposit        = user's own deposit required
// minDirects        = number of DIRECT referrals required
// minTeamBusiness   = total downline business ($) required
const C_VIP_RANKS = [
  { rank: "DEMO-CVIP", minDeposit: 20,   minDirects: 0, minTeamBusiness: 0     },
  { rank: "C-VIP-1",   minDeposit: 100,  minDirects: 0, minTeamBusiness: 0     },
  { rank: "C-VIP-2",   minDeposit: 200,  minDirects: 2, minTeamBusiness: 0     },
  { rank: "C-VIP-3",   minDeposit: 300,  minDirects: 3, minTeamBusiness: 0     },
  { rank: "C-VIP-4",   minDeposit: 400,  minDirects: 4, minTeamBusiness: 0     },
  { rank: "C-VIP-5",   minDeposit: 500,  minDirects: 5, minTeamBusiness: 5000  },
  { rank: "C-VIP-6",   minDeposit: 1000, minDirects: 6, minTeamBusiness: 10000 },
  { rank: "C-VIP-7",   minDeposit: 2000, minDirects: 7, minTeamBusiness: 25000 },
];

// ---------- Bonuses ----------
const SAME_LEVEL_BONUS = {
  "C-VIP-5": 10, // % — only C-VIP-5 holders earn this, from their downline C-VIP-5s
};

const GLOBAL_DEV_RANK_BONUS = {
  DEFAULT: 20,      // % base rate for everyone eligible
  "C-VIP-6": 40,     // % override
  "C-VIP-7": 60,     // % override
};

// ---------- Company margin ----------
const COMPANY_MARGIN_PERCENT = 10; // company keeps 10%
const DISTRIBUTION_POOL_PERCENT = 90; // 90% goes back out as commissions/bonus

module.exports = {
  T_VIP_RANKS,
  C_VIP_RANKS,
  SAME_LEVEL_BONUS,
  GLOBAL_DEV_RANK_BONUS,
  COMPANY_MARGIN_PERCENT,
  DISTRIBUTION_POOL_PERCENT,
};
