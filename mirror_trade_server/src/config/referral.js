/**
 * Referral program constants (overridable via env).
 */
module.exports = {
  /** Wallet credit (USD / USDT) for referrer AND new user when referral completes */
  REWARD_AMOUNT: Number(process.env.REFERRAL_REWARD_AMOUNT) || 50,

  /** Max new signups that may use a given code per calendar day (UTC) */
  MAX_REFERRALS_PER_CODE_PER_DAY:
    Number(process.env.REFERRAL_MAX_PER_CODE_PER_DAY) || 20,

  /**
   * Deep-link / share base URL shown to users.
   * Example invite: https://mirrortrade.app/signup?ref=AM4729
   */
  INVITE_BASE_URL:
    process.env.REFERRAL_INVITE_BASE_URL || "https://mirrortrade.app/signup",
};
