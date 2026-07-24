/**
 * Dual-wallet model (all amounts in USD / USDT):
 *   usdtBalance   — deposit principal (BNB → USDT). Spend on VIP levels only.
 *   walletBalance — app earnings (referral, bonuses, profit share). WITHDRAWABLE.
 *   totalDeposit  — cumulative VIP capital from level purchases (drives T/C-VIP).
 * Exchange capital is separate (stats only) — never mixed into withdraw.
 */
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const DepositRequest = require("../models/DepositRequest");
const WithdrawRequest = require("../models/WithdrawRequest");
const {
  BNB_DEPOSIT_ADDRESS,
  BNB_NETWORK,
  DEPOSIT_COIN,
  BNB_TO_USDT_RATE,
  MIN_DEPOSIT_USDT,
  MAX_DEPOSIT_USDT,
  MIN_WITHDRAW_USDT,
  AUTO_CREDIT_DEPOSITS,
} = require("../config/wallet");
const { T_VIP_RANKS, C_VIP_RANKS } = require("../config/ranks");
const { recalculateAndSaveRanks } = require("./rankCalculator");
const {
  recalculateUplineChain,
  maybePaySameLevelOnRankUp,
} = require("./capitalService");
const { countDirects, calculateTeamBusiness } = require("./teamBusiness");

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function getDepositInfo() {
  return {
    coin: DEPOSIT_COIN,
    network: BNB_NETWORK,
    address: BNB_DEPOSIT_ADDRESS,
    creditCurrency: "USDT",
    displayCurrency: "USD",
    bnbToUsdtRate: BNB_TO_USDT_RATE,
    minDepositUsdt: MIN_DEPOSIT_USDT,
    maxDepositUsdt: MAX_DEPOSIT_USDT,
    /** Payload for QR code apps (plain address is enough for most wallets) */
    qrPayload: BNB_DEPOSIT_ADDRESS,
    note:
      "Send BNB only on the stated network. After payment, submit your amount and TxHash. Credited balance is shown as USDT (USD).",
  };
}

/**
 * Credit USDT deposit balance (idempotent if depositRequest already credited).
 */
async function creditUsdtDeposit({
  userId,
  amountUsdt,
  note,
  depositRequestId = null,
  txHash = null,
}) {
  const amount = round2(amountUsdt);
  if (!amount || amount <= 0 || Number.isNaN(amount)) {
    throw Object.assign(new Error("Valid USDT amount is required"), {
      statusCode: 400,
    });
  }

  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error("User not found"), { statusCode: 404 });
  }

  user.usdtBalance = round2(Number(user.usdtBalance || 0) + amount);
  await user.save();

  await Transaction.create({
    user: user._id,
    type: "BNB_DEPOSIT",
    amount,
    note:
      note ||
      `BNB deposit credited · +${amount} USDT${txHash ? ` · tx ${txHash}` : ""}`,
    paymentRef: depositRequestId || null,
  });

  return snapshotWallet(user._id);
}

/**
 * User submits a BNB deposit request (optionally auto-credits in demo mode).
 */
async function createDepositRequest({
  userId,
  amountUsdt,
  amountBnb = null,
  txHash = null,
}) {
  const amount = round2(amountUsdt);
  if (!amount || amount < MIN_DEPOSIT_USDT) {
    throw Object.assign(
      new Error(`Minimum deposit is $${MIN_DEPOSIT_USDT} USDT`),
      { statusCode: 400 }
    );
  }
  if (amount > MAX_DEPOSIT_USDT) {
    throw Object.assign(
      new Error(`Maximum deposit is $${MAX_DEPOSIT_USDT} USDT`),
      { statusCode: 400 }
    );
  }

  if (
    !BNB_DEPOSIT_ADDRESS ||
    BNB_DEPOSIT_ADDRESS.includes("0000000000000000000000000000000000000000")
  ) {
    // Still allow creating request so admin can configure later; warn client
  }

  let bnbAmt = amountBnb != null ? round2(amountBnb) : null;
  if (bnbAmt == null && BNB_TO_USDT_RATE > 0) {
    bnbAmt = round2(amount / BNB_TO_USDT_RATE);
  }

  const req = await DepositRequest.create({
    user: userId,
    amountUsdt: amount,
    amountBnb: bnbAmt,
    coin: DEPOSIT_COIN,
    network: BNB_NETWORK,
    depositAddress: BNB_DEPOSIT_ADDRESS,
    txHash: txHash ? String(txHash).trim() : null,
    status: "pending",
  });

  // Demo / staging auto-credit when enabled and txHash provided
  if (AUTO_CREDIT_DEPOSITS && req.txHash) {
    return approveDepositRequest({
      depositId: req._id,
      adminId: null,
      note: "Auto-credited (AUTO_CREDIT_DEPOSITS)",
    });
  }

  return {
    deposit: formatDeposit(req),
    autoCredited: false,
    wallet: await snapshotWallet(userId),
  };
}

async function approveDepositRequest({ depositId, adminId = null, note = "" }) {
  const dep = await DepositRequest.findById(depositId);
  if (!dep) {
    throw Object.assign(new Error("Deposit request not found"), {
      statusCode: 404,
    });
  }
  if (dep.status === "credited") {
    return {
      deposit: formatDeposit(dep),
      autoCredited: true,
      wallet: await snapshotWallet(dep.user),
      alreadyCredited: true,
    };
  }
  if (dep.status === "rejected") {
    throw Object.assign(new Error("Deposit was rejected"), { statusCode: 400 });
  }

  const wallet = await creditUsdtDeposit({
    userId: dep.user,
    amountUsdt: dep.amountUsdt,
    note: note || `BNB deposit approved · +${dep.amountUsdt} USDT`,
    depositRequestId: dep._id,
    txHash: dep.txHash,
  });

  dep.status = "credited";
  dep.creditedAt = new Date();
  dep.reviewedBy = adminId;
  if (note) dep.note = note;
  await dep.save();

  return {
    deposit: formatDeposit(dep),
    autoCredited: true,
    wallet,
    alreadyCredited: false,
  };
}

async function rejectDepositRequest({ depositId, adminId, note = "" }) {
  const dep = await DepositRequest.findById(depositId);
  if (!dep) {
    throw Object.assign(new Error("Deposit request not found"), {
      statusCode: 404,
    });
  }
  if (dep.status !== "pending") {
    throw Object.assign(new Error(`Cannot reject deposit in status ${dep.status}`), {
      statusCode: 400,
    });
  }
  dep.status = "rejected";
  dep.reviewedBy = adminId;
  dep.note = note || "Rejected by admin";
  await dep.save();
  return formatDeposit(dep);
}

/**
 * Purchase VIP capital level with usdtBalance.
 * Adds to totalDeposit → T-VIP / C-VIP ranks update.
 * body.rank optional: if set, charges the level's minDeposit price (top-up to that level).
 * body.amount optional: buy arbitrary USDT capital amount.
 */
async function purchaseLevel({ userId, rank = null, amount = null }) {
  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error("User not found"), { statusCode: 404 });
  }

  let price = null;
  let targetRank = rank;

  if (rank) {
    const t = T_VIP_RANKS.find((r) => r.rank === rank);
    const c = C_VIP_RANKS.find((r) => r.rank === rank);
    const def = t || c;
    if (!def) {
      throw Object.assign(new Error(`Unknown rank: ${rank}`), {
        statusCode: 400,
      });
    }
    // Cost = how much more capital needed to reach this level's minDeposit
    const need = Math.max(0, round2(def.minDeposit - Number(user.totalDeposit || 0)));
    if (need <= 0) {
      throw Object.assign(
        new Error(`You already qualify for ${rank} or higher capital`),
        { statusCode: 400 }
      );
    }
    price = need;
    targetRank = def.rank;
  } else if (amount != null) {
    price = round2(amount);
    if (!price || price <= 0) {
      throw Object.assign(new Error("Valid purchase amount is required"), {
        statusCode: 400,
      });
    }
  } else {
    throw Object.assign(new Error("Provide rank or amount to purchase"), {
      statusCode: 400,
    });
  }

  const bal = round2(Number(user.usdtBalance || 0));
  if (bal < price) {
    throw Object.assign(
      new Error(
        `Insufficient USDT balance. Need $${price}, have $${bal}. Deposit BNB first.`
      ),
      { statusCode: 400 }
    );
  }

  const previousCVip = user.cVipRank;
  const previousDeposit = Number(user.totalDeposit || 0);

  user.usdtBalance = round2(bal - price);
  user.totalDeposit = round2(previousDeposit + price);
  user.capitalSource = "purchase";
  user.capitalSyncedAt = new Date();
  await user.save();

  await Transaction.create({
    user: user._id,
    type: "LEVEL_PURCHASE",
    amount: price,
    rankAtTime: targetRank || user.tVipRank,
    note: targetRank
      ? `Purchased level capital toward ${targetRank} · $${price} USDT`
      : `Purchased VIP capital · $${price} USDT`,
  });

  const { tVip, cVip } = await recalculateAndSaveRanks(user);
  await maybePaySameLevelOnRankUp(user._id, previousCVip, cVip.rank, price);
  await recalculateUplineChain(user, price);

  const wallet = await snapshotWallet(user._id);
  return {
    ...wallet,
    purchased: price,
    targetRank: targetRank || null,
    tVip: tVip.rank,
    cVip: cVip.rank,
  };
}

/**
 * Request withdrawal of EARNINGS only (walletBalance).
 * Freezes amount immediately so it cannot be double-spent.
 */
async function requestWithdraw({
  userId,
  amount,
  payoutAddress,
  network = BNB_NETWORK,
}) {
  const amt = round2(amount);
  if (!amt || amt < MIN_WITHDRAW_USDT) {
    throw Object.assign(
      new Error(`Minimum withdraw is $${MIN_WITHDRAW_USDT} USDT`),
      { statusCode: 400 }
    );
  }
  if (!payoutAddress || String(payoutAddress).trim().length < 10) {
    throw Object.assign(new Error("Valid payout address is required"), {
      statusCode: 400,
    });
  }

  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error("User not found"), { statusCode: 404 });
  }

  const earnings = round2(Number(user.walletBalance || 0));
  if (earnings < amt) {
    throw Object.assign(
      new Error(
        `Insufficient earnings. Withdrawable: $${earnings} USDT (deposits cannot be withdrawn)`
      ),
      { statusCode: 400 }
    );
  }

  user.walletBalance = round2(earnings - amt);
  await user.save();

  const wr = await WithdrawRequest.create({
    user: userId,
    amount: amt,
    currency: "USDT",
    payoutAddress: String(payoutAddress).trim(),
    network: network || BNB_NETWORK,
    status: "pending",
  });

  await Transaction.create({
    user: userId,
    type: "WITHDRAWAL",
    amount: amt,
    note: `Withdraw request · $${amt} USDT → ${String(payoutAddress).slice(0, 10)}…`,
  });

  return {
    withdraw: formatWithdraw(wr),
    wallet: await snapshotWallet(userId),
  };
}

async function markWithdrawPaid({ withdrawId, adminId, note = "" }) {
  const wr = await WithdrawRequest.findById(withdrawId);
  if (!wr) {
    throw Object.assign(new Error("Withdraw request not found"), {
      statusCode: 404,
    });
  }
  if (wr.status !== "pending") {
    throw Object.assign(new Error(`Cannot pay withdraw in status ${wr.status}`), {
      statusCode: 400,
    });
  }
  wr.status = "paid";
  wr.processedAt = new Date();
  wr.reviewedBy = adminId;
  if (note) wr.note = note;
  await wr.save();
  return formatWithdraw(wr);
}

async function rejectWithdraw({ withdrawId, adminId, note = "" }) {
  const wr = await WithdrawRequest.findById(withdrawId);
  if (!wr) {
    throw Object.assign(new Error("Withdraw request not found"), {
      statusCode: 404,
    });
  }
  if (wr.status !== "pending") {
    throw Object.assign(new Error(`Cannot reject withdraw in status ${wr.status}`), {
      statusCode: 400,
    });
  }

  // Refund earnings
  const user = await User.findById(wr.user);
  if (user) {
    user.walletBalance = round2(Number(user.walletBalance || 0) + wr.amount);
    await user.save();
    await Transaction.create({
      user: user._id,
      type: "REFERRAL_REWARD",
      amount: wr.amount,
      note: `Withdraw rejected — earnings refunded · $${wr.amount}`,
    });
  }

  wr.status = "rejected";
  wr.processedAt = new Date();
  wr.reviewedBy = adminId;
  wr.note = note || "Rejected — earnings refunded";
  await wr.save();
  return formatWithdraw(wr);
}

async function snapshotWallet(userId) {
  const user = await User.findById(userId);
  if (!user) return null;
  const directs = await countDirects(user._id);
  const teamBusiness = await calculateTeamBusiness(user._id);
  return {
    usdtBalance: round2(user.usdtBalance || 0),
    /** Alias for UI — spendable deposit balance in USDT */
    depositBalance: round2(user.usdtBalance || 0),
    /** Earnings only — withdrawable */
    walletBalance: round2(user.walletBalance || 0),
    earningsBalance: round2(user.walletBalance || 0),
    withdrawable: round2(user.walletBalance || 0),
    totalDeposit: round2(user.totalDeposit || 0),
    levelCapital: round2(user.totalDeposit || 0),
    exchangeCapital: round2(user.exchangeCapital || 0),
    tVipRank: user.tVipRank || "NONE",
    cVipRank: user.cVipRank || "NONE",
    referralRewardsEarned: round2(user.referralRewardsEarned || 0),
    directs,
    teamBusiness: round2(teamBusiness),
    currency: "USD",
    unit: "USDT",
  };
}

function formatDeposit(d) {
  return {
    id: d._id,
    amountUsdt: d.amountUsdt,
    amountBnb: d.amountBnb,
    coin: d.coin,
    network: d.network,
    depositAddress: d.depositAddress,
    txHash: d.txHash,
    status: d.status,
    note: d.note,
    creditedAt: d.creditedAt,
    createdAt: d.createdAt,
  };
}

function formatWithdraw(w) {
  return {
    id: w._id,
    amount: w.amount,
    currency: w.currency,
    payoutAddress: w.payoutAddress,
    network: w.network,
    status: w.status,
    note: w.note,
    processedAt: w.processedAt,
    createdAt: w.createdAt,
  };
}

module.exports = {
  getDepositInfo,
  creditUsdtDeposit,
  createDepositRequest,
  approveDepositRequest,
  rejectDepositRequest,
  purchaseLevel,
  requestWithdraw,
  markWithdrawPaid,
  rejectWithdraw,
  snapshotWallet,
  formatDeposit,
  formatWithdraw,
};
