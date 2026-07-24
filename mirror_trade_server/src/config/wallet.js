/**
 * In-app wallet + BNB deposit config (USD / USDT).
 * Deposit path: user sends BNB to company QR address → credited as USDT.
 * Spend path: buy VIP levels from usdtBalance.
 * Withdraw path: earnings only (walletBalance) — never deposit principal.
 */

module.exports = {
  /** Company BNB receive address (BEP-20 / BSC). Override via env. */
  BNB_DEPOSIT_ADDRESS:
    process.env.BNB_DEPOSIT_ADDRESS ||
    "0x0000000000000000000000000000000000000000",

  /** Network label shown in app */
  BNB_NETWORK: process.env.BNB_NETWORK || "BSC (BEP-20)",

  /** Coin user sends */
  DEPOSIT_COIN: process.env.DEPOSIT_COIN || "BNB",

  /** App display / credit currency */
  CREDIT_CURRENCY: "USDT",
  DISPLAY_CURRENCY: "USD",

  /**
   * How many USDT credited per 1 BNB received.
   * Ops should update from market rate; default is placeholder for demo.
   */
  BNB_TO_USDT_RATE: Number(process.env.BNB_TO_USDT_RATE) || 600,

  MIN_DEPOSIT_USDT: Number(process.env.MIN_DEPOSIT_USDT) || 10,
  MAX_DEPOSIT_USDT: Number(process.env.MAX_DEPOSIT_USDT) || 100000,

  MIN_WITHDRAW_USDT: Number(process.env.MIN_WITHDRAW_USDT) || 10,

  /**
   * When true, deposit requests with a txHash auto-credit (demo / staging).
   * Production should keep false and use admin approve.
   */
  AUTO_CREDIT_DEPOSITS:
    String(process.env.AUTO_CREDIT_DEPOSITS || "false").toLowerCase() ===
    "true",
};
