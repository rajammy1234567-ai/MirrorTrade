/**
 * Public signal feed + paper execution into CopyPosition book.
 */
const Signal = require("../models/Signal");
const CopyPosition = require("../models/CopyPosition");
const User = require("../models/User");
const { getPrice } = require("./marketPrice");

const SEED_SIGNALS = [
  {
    slug: "nova-btc-long",
    provider: "Nova Desk",
    pair: "BTC/USDT",
    symbol: "BTCUSDT",
    direction: "long",
    entry: 65800,
    target: 68500,
    stopLoss: 64200,
  },
  {
    slug: "pulse-eth-short",
    provider: "Pulse FX",
    pair: "ETH/USDT",
    symbol: "ETHUSDT",
    direction: "short",
    entry: 3290,
    target: 3120,
    stopLoss: 3365,
  },
  {
    slug: "orbit-sol-long",
    provider: "Orbit Alpha",
    pair: "SOL/USDT",
    symbol: "SOLUSDT",
    direction: "long",
    entry: 146.5,
    target: 158.0,
    stopLoss: 141.2,
  },
  {
    slug: "nova-bnb-long",
    provider: "Nova Desk",
    pair: "BNB/USDT",
    symbol: "BNBUSDT",
    direction: "long",
    entry: 582,
    target: 610,
    stopLoss: 568,
  },
];

function timeAgo(date) {
  const ms = Date.now() - new Date(date).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function formatSignal(doc) {
  return {
    id: String(doc._id),
    provider: doc.provider,
    pair: doc.pair,
    symbol: doc.symbol,
    direction: doc.direction,
    entry: doc.entry,
    target: doc.target,
    stopLoss: doc.stopLoss,
    time: timeAgo(doc.publishedAt || doc.createdAt),
    publishedAt: doc.publishedAt || doc.createdAt,
  };
}

async function ensureSeedSignals() {
  const count = await Signal.countDocuments();
  if (count > 0) return;

  for (const seed of SEED_SIGNALS) {
    let entry = seed.entry;
    try {
      entry = await getPrice(seed.symbol, seed.entry);
    } catch {
      // keep seed entry
    }
    const scale = entry / seed.entry;
    // eslint-disable-next-line no-await-in-loop
    await Signal.findOneAndUpdate(
      { slug: seed.slug },
      {
        ...seed,
        entry,
        target: Math.round(seed.target * scale * 100) / 100,
        stopLoss: Math.round(seed.stopLoss * scale * 100) / 100,
        isActive: true,
        publishedAt: new Date(Date.now() - Math.random() * 3 * 3600000),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
}

async function listSignals() {
  await ensureSeedSignals();
  const rows = await Signal.find({ isActive: true })
    .sort({ publishedAt: -1 })
    .limit(50);
  return rows.map(formatSignal);
}

/**
 * Execute a signal as a paper position (appears in portfolio).
 */
async function executeSignal({ userId, signalId, amount = 100 }) {
  await ensureSeedSignals();

  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    const err = new Error("User not found or inactive");
    err.statusCode = 401;
    throw err;
  }

  const signal = await Signal.findById(signalId);
  if (!signal || !signal.isActive) {
    const err = new Error("Signal not found");
    err.statusCode = 404;
    throw err;
  }

  const notional = Number(amount);
  if (!Number.isFinite(notional) || notional < 25) {
    const err = new Error("Minimum signal size is $25 USDT");
    err.statusCode = 400;
    throw err;
  }

  const usdt = Number(user.usdtBalance || 0);
  const level = Number(user.totalDeposit || 0);
  const exchange = Number(user.exchangeCapital || 0);
  const allocatable = Math.max(usdt + level, exchange, 0);
  if (notional > allocatable) {
    const err = new Error(
      `Insufficient capital. Available: $${allocatable.toFixed(2)} USDT`
    );
    err.statusCode = 400;
    throw err;
  }

  let entry = signal.entry;
  try {
    entry = await getPrice(signal.symbol, signal.entry);
  } catch {
    // keep signal entry
  }
  const qty = notional / entry;

  const pos = await CopyPosition.create({
    user: userId,
    subscription: null,
    trader: null,
    traderName: signal.provider,
    sourceType: "signal",
    source: signal.provider,
    pair: signal.pair,
    symbol: signal.symbol,
    side: signal.direction,
    notional,
    entry,
    current: entry,
    qty,
    pnl: 0,
    pnlPct: 0,
    status: "active",
  });

  return {
    position: {
      id: String(pos._id),
      subscriptionId: null,
      traderId: null,
      source: signal.provider,
      sourceType: "signal",
      pair: pos.pair,
      side: pos.side,
      entry: pos.entry,
      current: pos.current,
      notional: pos.notional,
      qty: pos.qty,
      pnl: 0,
      pnlPct: 0,
      status: "active",
      closedAt: null,
      closeReason: null,
      createdAt: pos.createdAt,
    },
    mode: "paper",
    note:
      "PAPER MODE: signal opened with live Binance marks. No real exchange orders.",
  };
}

module.exports = {
  listSignals,
  executeSignal,
  ensureSeedSignals,
  formatSignal,
};
