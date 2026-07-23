/**
 * Copy-trade engine (paper book + live market marks).
 * ------------------------------------------------------------
 * - Master traders live in Trader collection
 * - Start copy → open legs proportional to allocation
 * - Prices from Binance public API
 * - Max drawdown auto-liquidates the subscription
 * ------------------------------------------------------------
 */
const Trader = require("../models/Trader");
const CopySubscription = require("../models/CopySubscription");
const CopyPosition = require("../models/CopyPosition");
const { getPrices } = require("./marketPrice");

const SEED_TRADERS = [
  {
    slug: "alex-mercer",
    name: "Alex Mercer",
    handle: "@alexmercer",
    avatar: "AM",
    verified: true,
    winRate: 78,
    roi30d: 42.4,
    totalRoi: 180,
    followers: 12400,
    copiers: 1240,
    risk: "Low",
    maxDrawdown: 8.2,
    avgHold: "4.2h",
    bio: "BTC & ETH swing specialist. Risk-managed positions with strict invalidation.",
    equity: [100, 104, 103, 110, 115, 112, 122, 128, 130, 142],
    openLegs: [
      { pair: "BTC/USDT", symbol: "BTCUSDT", side: "long", weight: 0.5, entry: 0 },
      { pair: "ETH/USDT", symbol: "ETHUSDT", side: "long", weight: 0.5, entry: 0 },
    ],
  },
  {
    slug: "sarah-kim",
    name: "Sarah Kim",
    handle: "@sarahkim_btc",
    avatar: "SK",
    verified: true,
    winRate: 71,
    roi30d: 29.2,
    totalRoi: 110,
    followers: 8100,
    copiers: 890,
    risk: "Medium",
    maxDrawdown: 14.5,
    avgHold: "1d 2h",
    bio: "Momentum trader focused on majors and high-liquidity alts.",
    equity: [100, 98, 105, 108, 112, 109, 118, 125, 121, 129],
    openLegs: [
      { pair: "BTC/USDT", symbol: "BTCUSDT", side: "long", weight: 0.4, entry: 0 },
      { pair: "SOL/USDT", symbol: "SOLUSDT", side: "long", weight: 0.35, entry: 0 },
      { pair: "ETH/USDT", symbol: "ETHUSDT", side: "short", weight: 0.25, entry: 0 },
    ],
  },
  {
    slug: "maya-chen",
    name: "Maya Chen",
    handle: "@mayachen",
    avatar: "MC",
    verified: true,
    winRate: 66,
    roi30d: 18.8,
    totalRoi: 90,
    followers: 5200,
    copiers: 640,
    risk: "Medium",
    maxDrawdown: 16.1,
    avgHold: "8h",
    bio: "Intraday setups with tight risk and structured take-profit ladders.",
    equity: [100, 102, 99, 106, 104, 111, 108, 115, 112, 119],
    openLegs: [
      { pair: "BNB/USDT", symbol: "BNBUSDT", side: "long", weight: 0.5, entry: 0 },
      { pair: "XRP/USDT", symbol: "XRPUSDT", side: "long", weight: 0.5, entry: 0 },
    ],
  },
  {
    slug: "quiet-whale",
    name: "Quiet Whale",
    handle: "@quietwhale",
    avatar: "QW",
    verified: true,
    winRate: 82,
    roi30d: 9.4,
    totalRoi: 55,
    followers: 22100,
    copiers: 3100,
    risk: "Low",
    maxDrawdown: 5.2,
    avgHold: "4d",
    bio: "Conservative macro-aligned positions. Capital preservation first.",
    equity: [100, 101, 101, 102, 103, 104, 105, 106, 107, 109],
    openLegs: [
      { pair: "BTC/USDT", symbol: "BTCUSDT", side: "long", weight: 0.7, entry: 0 },
      { pair: "ETH/USDT", symbol: "ETHUSDT", side: "long", weight: 0.3, entry: 0 },
    ],
  },
];

function calcPnl(side, entry, current, qty) {
  if (!entry || !qty) return { pnl: 0, pnlPct: 0 };
  const dir = side === "short" ? -1 : 1;
  const pnl = dir * (current - entry) * qty;
  const notional = entry * qty;
  const pnlPct = notional > 0 ? (pnl / notional) * 100 : 0;
  return { pnl, pnlPct };
}

function formatTrader(doc, extra = {}) {
  return {
    id: String(doc._id),
    slug: doc.slug,
    name: doc.name,
    handle: doc.handle,
    avatar: doc.avatar,
    bio: doc.bio,
    verified: doc.verified,
    winRate: doc.winRate,
    roi30d: doc.roi30d,
    totalRoi: doc.totalRoi,
    followers: doc.followers,
    copiers: doc.copiers,
    risk: doc.risk,
    maxDrawdown: doc.maxDrawdown,
    avgHold: doc.avgHold,
    equity: doc.equity || [],
    openLegs: (doc.openLegs || []).map((l) => ({
      pair: l.pair,
      symbol: l.symbol,
      side: l.side,
      weight: l.weight,
      entry: l.entry,
    })),
    ...extra,
  };
}

function formatPosition(doc) {
  return {
    id: String(doc._id),
    subscriptionId: String(doc.subscription),
    traderId: String(doc.trader),
    source: doc.traderName || "Trader",
    sourceType: "trader",
    pair: doc.pair,
    side: doc.side,
    entry: doc.entry,
    current: doc.current,
    notional: doc.notional,
    qty: doc.qty,
    pnl: Math.round(doc.pnl * 100) / 100,
    pnlPct: Math.round(doc.pnlPct * 100) / 100,
    status: doc.status,
    closedAt: doc.closedAt,
    closeReason: doc.closeReason,
    createdAt: doc.createdAt,
  };
}

function formatSubscription(doc) {
  const trader = doc.trader && doc.trader.name ? formatTrader(doc.trader) : null;
  return {
    id: String(doc._id),
    traderId: trader?.id || String(doc.trader),
    trader,
    amount: doc.amount,
    maxDd: doc.maxDd,
    multiplier: doc.multiplier,
    copyOpen: doc.copyOpen,
    status: doc.status,
    peakEquity: doc.peakEquity,
    equity: doc.equity,
    realizedPnl: doc.realizedPnl,
    unrealizedPnl: doc.unrealizedPnl,
    startedAt: doc.startedAt,
    stoppedAt: doc.stoppedAt,
    stopReason: doc.stopReason,
  };
}

/** Ensure seed traders exist and legs have live entries. */
async function ensureSeedTraders() {
  const count = await Trader.countDocuments();
  if (count > 0) {
    // Refresh zero entries with live prices occasionally
    const needPrice = await Trader.findOne({ "openLegs.entry": 0 });
    if (!needPrice) return;
  }

  const symbols = [
    ...new Set(
      SEED_TRADERS.flatMap((t) => t.openLegs.map((l) => l.symbol))
    ),
  ];
  let prices = {};
  try {
    prices = await getPrices(symbols);
  } catch {
    prices = {
      BTCUSDT: 65000,
      ETHUSDT: 3500,
      SOLUSDT: 150,
      BNBUSDT: 580,
      XRPUSDT: 0.6,
    };
  }

  for (const seed of SEED_TRADERS) {
    const legs = seed.openLegs.map((l) => ({
      ...l,
      entry: prices[l.symbol] || l.entry || 1,
    }));
    await Trader.findOneAndUpdate(
      { slug: seed.slug },
      { ...seed, openLegs: legs, isActive: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
}

async function listTraders({ sort = "roi", risk } = {}) {
  await ensureSeedTraders();
  const q = { isActive: true };
  if (risk) q.risk = risk;
  let traders = await Trader.find(q).lean();
  if (sort === "followers") {
    traders.sort((a, b) => b.followers - a.followers);
  } else if (sort === "new") {
    traders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else {
    traders.sort((a, b) => b.roi30d - a.roi30d);
  }
  return traders.map((t) => formatTrader(t));
}

async function getTraderById(id) {
  await ensureSeedTraders();
  const t = await Trader.findById(id);
  if (!t || !t.isActive) {
    const err = new Error("Trader not found");
    err.statusCode = 404;
    throw err;
  }
  // Refresh open leg marks for display
  const prices = await getPrices(t.openLegs.map((l) => l.symbol));
  const legs = t.openLegs.map((l) => {
    const current = prices[l.symbol.toUpperCase()] || l.entry;
    const { pnlPct } = calcPnl(l.side, l.entry, current, 1);
    return {
      pair: l.pair,
      symbol: l.symbol,
      side: l.side,
      weight: l.weight,
      entry: l.entry,
      current,
      pnlPct: Math.round(pnlPct * 100) / 100,
    };
  });
  return formatTrader(t, { openLegs: legs, recentTrades: buildRecentFromLegs(legs) });
}

function buildRecentFromLegs(legs) {
  return legs.slice(0, 5).map((l) => ({
    pair: l.pair,
    entry: l.entry,
    exit: l.current,
    pnl: Math.round(((l.pnlPct || 0) / 100) * 1000 * 100) / 100,
    time: "Open",
    side: l.side,
  }));
}

/**
 * Mark all active positions for a user to market + enforce DD stops.
 */
async function markUserPositions(userId) {
  const positions = await CopyPosition.find({
    user: userId,
    status: "active",
  });
  if (!positions.length) return { positions: [], subscriptions: [] };

  const prices = await getPrices(positions.map((p) => p.symbol));
  const subIds = [...new Set(positions.map((p) => String(p.subscription)))];

  for (const pos of positions) {
    const current = prices[pos.symbol.toUpperCase()] || pos.current || pos.entry;
    const { pnl, pnlPct } = calcPnl(pos.side, pos.entry, current, pos.qty);
    pos.current = current;
    pos.pnl = pnl;
    pos.pnlPct = pnlPct;
    await pos.save();
  }

  // Update subscription equity + DD
  for (const sid of subIds) {
    // eslint-disable-next-line no-await-in-loop
    await refreshSubscriptionEquity(sid);
  }

  return {
    positions: await CopyPosition.find({ user: userId, status: "active" }),
    subscriptions: await CopySubscription.find({
      user: userId,
      status: "active",
    }),
  };
}

async function refreshSubscriptionEquity(subscriptionId) {
  const sub = await CopySubscription.findById(subscriptionId);
  if (!sub || sub.status !== "active") return sub;

  const open = await CopyPosition.find({
    subscription: sub._id,
    status: "active",
  });
  const unrealized = open.reduce((s, p) => s + (p.pnl || 0), 0);
  // Equity = allocated capital + realized + unrealized
  const equity = sub.amount + (sub.realizedPnl || 0) + unrealized;
  sub.unrealizedPnl = unrealized;
  sub.equity = equity;
  if (equity > (sub.peakEquity || 0)) sub.peakEquity = equity;

  const peak = sub.peakEquity || sub.amount;
  const ddPct = peak > 0 ? ((peak - equity) / peak) * 100 : 0;

  if (ddPct >= sub.maxDd) {
    await liquidateSubscription(sub, "max_drawdown");
    return CopySubscription.findById(subscriptionId);
  }

  await sub.save();
  return sub;
}

async function liquidateSubscription(sub, reason) {
  const open = await CopyPosition.find({
    subscription: sub._id,
    status: "active",
  });
  const prices = await getPrices(open.map((p) => p.symbol));
  let realizedAdd = 0;

  for (const pos of open) {
    const current = prices[pos.symbol.toUpperCase()] || pos.current || pos.entry;
    const { pnl, pnlPct } = calcPnl(pos.side, pos.entry, current, pos.qty);
    pos.current = current;
    pos.pnl = pnl;
    pos.pnlPct = pnlPct;
    pos.status = "closed";
    pos.closedAt = new Date();
    pos.closeReason = reason;
    realizedAdd += pnl;
    // eslint-disable-next-line no-await-in-loop
    await pos.save();
  }

  sub.realizedPnl = (sub.realizedPnl || 0) + realizedAdd;
  sub.unrealizedPnl = 0;
  sub.equity = sub.amount + sub.realizedPnl;
  sub.status = reason === "max_drawdown" ? "liquidated" : "stopped";
  sub.stoppedAt = new Date();
  sub.stopReason = reason;
  await sub.save();
  return sub;
}

/**
 * Start copying a trader.
 */
async function startCopy({
  userId,
  traderId,
  amount,
  maxDd,
  multiplier,
  copyOpen,
}) {
  await ensureSeedTraders();

  const amt = Number(amount);
  const dd = Number(maxDd);
  const mult = Number(multiplier) || 1;

  if (!Number.isFinite(amt) || amt < 100) {
    const err = new Error("Minimum investment is ₹100");
    err.statusCode = 400;
    throw err;
  }
  if (!Number.isFinite(dd) || dd < 5 || dd > 80) {
    const err = new Error("Max drawdown must be between 5 and 80");
    err.statusCode = 400;
    throw err;
  }
  if (mult < 1 || mult > 5) {
    const err = new Error("Multiplier must be between 1x and 5x");
    err.statusCode = 400;
    throw err;
  }

  const trader = await Trader.findById(traderId);
  if (!trader || !trader.isActive) {
    const err = new Error("Trader not found");
    err.statusCode = 404;
    throw err;
  }

  const existing = await CopySubscription.findOne({
    user: userId,
    trader: trader._id,
    status: "active",
  });
  if (existing) {
    const err = new Error("You are already copying this trader. Stop it first.");
    err.statusCode = 400;
    throw err;
  }

  // Cap concurrent active copies per user
  const activeCount = await CopySubscription.countDocuments({
    user: userId,
    status: "active",
  });
  if (activeCount >= 10) {
    const err = new Error("Maximum 10 active copy sessions");
    err.statusCode = 400;
    throw err;
  }

  const effective = amt * mult;
  const sub = await CopySubscription.create({
    user: userId,
    trader: trader._id,
    amount: amt,
    maxDd: dd,
    multiplier: mult,
    copyOpen: Boolean(copyOpen),
    status: "active",
    peakEquity: amt,
    equity: amt,
    realizedPnl: 0,
    unrealizedPnl: 0,
  });

  const opened = [];
  if (copyOpen !== false && trader.openLegs?.length) {
    const symbols = trader.openLegs.map((l) => l.symbol);
    const prices = await getPrices(symbols);
    const totalWeight =
      trader.openLegs.reduce((s, l) => s + (l.weight || 0), 0) || 1;

    for (const leg of trader.openLegs) {
      const w = (leg.weight || 0) / totalWeight;
      const notional = effective * w;
      const entry = prices[leg.symbol.toUpperCase()] || leg.entry || 1;
      const qty = notional / entry;
      const pos = await CopyPosition.create({
        user: userId,
        subscription: sub._id,
        trader: trader._id,
        traderName: trader.name,
        pair: leg.pair,
        symbol: leg.symbol,
        side: leg.side,
        notional,
        entry,
        current: entry,
        qty,
        pnl: 0,
        pnlPct: 0,
        status: "active",
      });
      opened.push(pos);
    }
  }

  // Increment copier count
  trader.copiers = (trader.copiers || 0) + 1;
  await trader.save();

  const populated = await CopySubscription.findById(sub._id).populate("trader");

  return {
    subscription: formatSubscription(populated),
    positions: opened.map(formatPosition),
    mode: "paper", // live exchange orders not placed — capital stays on exchange
    note:
      "Copy session is live in MirrorTrade (paper book marked to Binance prices). Funds stay on your exchange; connect API for VIP capital only.",
  };
}

async function stopCopy({ userId, subscriptionId }) {
  const sub = await CopySubscription.findOne({
    _id: subscriptionId,
    user: userId,
  });
  if (!sub) {
    const err = new Error("Copy session not found");
    err.statusCode = 404;
    throw err;
  }
  if (sub.status !== "active") {
    return formatSubscription(await sub.populate("trader"));
  }
  await liquidateSubscription(sub, "user_stop");
  const fresh = await CopySubscription.findById(sub._id).populate("trader");
  return formatSubscription(fresh);
}

async function listMySubscriptions(userId) {
  await markUserPositions(userId);
  const rows = await CopySubscription.find({ user: userId })
    .sort({ createdAt: -1 })
    .populate("trader")
    .limit(50);
  return rows.map(formatSubscription);
}

async function listMyPositions(userId, { status = "active" } = {}) {
  await markUserPositions(userId);
  const q = { user: userId };
  if (status === "active" || status === "closed") q.status = status;
  // "all" → no status filter
  const rows = await CopyPosition.find(q).sort({ updatedAt: -1 }).limit(100);
  return rows.map(formatPosition);
}

async function closePosition({ userId, positionId }) {
  const pos = await CopyPosition.findOne({ _id: positionId, user: userId });
  if (!pos) {
    const err = new Error("Position not found");
    err.statusCode = 404;
    throw err;
  }
  if (pos.status !== "active") {
    return formatPosition(pos);
  }

  const prices = await getPrices([pos.symbol]);
  const current = prices[pos.symbol.toUpperCase()] || pos.current || pos.entry;
  const { pnl, pnlPct } = calcPnl(pos.side, pos.entry, current, pos.qty);
  pos.current = current;
  pos.pnl = pnl;
  pos.pnlPct = pnlPct;
  pos.status = "closed";
  pos.closedAt = new Date();
  pos.closeReason = "user_close";
  await pos.save();

  const sub = await CopySubscription.findById(pos.subscription);
  if (sub && sub.status === "active") {
    sub.realizedPnl = (sub.realizedPnl || 0) + pnl;
    await sub.save();
    await refreshSubscriptionEquity(sub._id);
  }

  return formatPosition(pos);
}

async function portfolioSummary(userId) {
  await markUserPositions(userId);
  const [active, closed, subs] = await Promise.all([
    CopyPosition.find({ user: userId, status: "active" }),
    CopyPosition.find({ user: userId, status: "closed" }).limit(200),
    CopySubscription.find({ user: userId }),
  ]);

  const unrealized = active.reduce((s, p) => s + (p.pnl || 0), 0);
  const realized = closed.reduce((s, p) => s + (p.pnl || 0), 0);
  const wins = closed.filter((p) => p.pnl > 0).length;
  const losses = closed.filter((p) => p.pnl <= 0).length;
  const winRate =
    wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
  const allocated = subs
    .filter((s) => s.status === "active")
    .reduce((s, x) => s + x.amount, 0);

  return {
    allTimePnl: Math.round((realized + unrealized) * 100) / 100,
    realizedPnl: Math.round(realized * 100) / 100,
    unrealizedPnl: Math.round(unrealized * 100) / 100,
    openPositions: active.length,
    wins,
    losses,
    winRate,
    allocated,
    activeCopies: subs.filter((s) => s.status === "active").length,
  };
}

module.exports = {
  ensureSeedTraders,
  listTraders,
  getTraderById,
  startCopy,
  stopCopy,
  listMySubscriptions,
  listMyPositions,
  closePosition,
  portfolioSummary,
  formatTrader,
  formatPosition,
  formatSubscription,
};
