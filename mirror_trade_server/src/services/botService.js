/**
 * Paper trading bots — live Binance marks, no real exchange orders.
 */
const Bot = require("../models/Bot");
const User = require("../models/User");
const CopySubscription = require("../models/CopySubscription");
const { getPrice, getPrices } = require("./marketPrice");

function pairToSymbol(pair) {
  return String(pair || "")
    .toUpperCase()
    .replace("/", "")
    .replace("-", "")
    .trim();
}

function calcPnl(side, entry, current, qty) {
  if (!entry || !qty) return { pnl: 0, pnlPct: 0 };
  const dir = side === "short" ? -1 : 1;
  const pnl = dir * (current - entry) * qty;
  const notional = entry * qty;
  const pnlPct = notional > 0 ? (pnl / notional) * 100 : 0;
  return { pnl, pnlPct };
}

function formatRuntime(startedAt, stoppedAt) {
  const end = stoppedAt ? new Date(stoppedAt) : new Date();
  const start = new Date(startedAt || end);
  let ms = Math.max(0, end - start);
  const days = Math.floor(ms / 86400000);
  ms %= 86400000;
  const hours = Math.floor(ms / 3600000);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${mins}m`;
  return mins > 0 ? `${mins}m` : "0h";
}

function lastActiveHours(lastActiveAt) {
  if (!lastActiveAt) return 99;
  return Math.max(
    0,
    (Date.now() - new Date(lastActiveAt).getTime()) / 3600000
  );
}

function formatBot(doc) {
  return {
    id: String(doc._id),
    name: doc.name,
    type: doc.type,
    pair: doc.pair,
    symbol: doc.symbol,
    market: doc.market,
    side: doc.side,
    investment: doc.investment,
    grids: doc.grids,
    low: doc.low,
    high: doc.high,
    entry: doc.entry,
    current: doc.current,
    position: Math.round((doc.position || 0) * 1e6) / 1e6,
    pnl: Math.round((doc.pnl || 0) * 100) / 100,
    pnlPct: Math.round((doc.pnlPct || 0) * 100) / 100,
    unrealizedPnl: Math.round((doc.unrealizedPnl || 0) * 100) / 100,
    running: !!doc.running && !doc.stopped,
    stopped: !!doc.stopped,
    stopMode: doc.stopMode || undefined,
    stoppedAt: doc.stoppedAt
      ? new Date(doc.stoppedAt)
          .toISOString()
          .slice(0, 16)
          .replace("T", " ")
      : undefined,
    runtime: doc.stopped
      ? formatRuntime(doc.startedAt, doc.stoppedAt)
      : doc.running
        ? formatRuntime(doc.startedAt)
        : "Paused",
    lastActiveHours: Math.round(lastActiveHours(doc.lastActiveAt) * 10) / 10,
    mode: doc.mode || "paper",
    startedAt: doc.startedAt,
    createdAt: doc.createdAt,
  };
}

async function allocatableCapital(userId) {
  const user = await User.findById(userId);
  if (!user) return { remaining: 0, user: null, used: 0 };

  const usdt = Number(user.usdtBalance || 0);
  const level = Number(user.totalDeposit || 0);
  const exchange = Number(user.exchangeCapital || 0);
  const allocatable = Math.max(usdt + level, exchange, 0);

  const [copyAgg, botAgg] = await Promise.all([
    CopySubscription.aggregate([
      { $match: { user: user._id, status: "active" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Bot.aggregate([
      { $match: { user: user._id, stopped: false } },
      { $group: { _id: null, total: { $sum: "$investment" } } },
    ]),
  ]);
  const used =
    Number(copyAgg[0]?.total || 0) + Number(botAgg[0]?.total || 0);
  const remaining = Math.max(0, allocatable - used);
  return { remaining, used, allocatable, user };
}

async function markBots(userId) {
  const bots = await Bot.find({ user: userId, stopped: false });
  if (!bots.length) return;
  const prices = await getPrices(bots.map((b) => b.symbol));
  for (const bot of bots) {
    if (!bot.running) continue;
    const current =
      prices[bot.symbol.toUpperCase()] || bot.current || bot.entry;
    const { pnl, pnlPct } = calcPnl(
      bot.side,
      bot.entry,
      current,
      bot.position
    );
    bot.current = current;
    bot.pnl = pnl;
    bot.pnlPct = pnlPct;
    bot.unrealizedPnl = pnl;
    bot.lastActiveAt = new Date();
    // eslint-disable-next-line no-await-in-loop
    await bot.save();
  }
}

async function listBots(userId) {
  await markBots(userId);
  const rows = await Bot.find({ user: userId }).sort({ createdAt: -1 }).limit(100);
  return rows.map(formatBot);
}

async function getBot(userId, botId) {
  await markBots(userId);
  const bot = await Bot.findOne({ _id: botId, user: userId });
  if (!bot) {
    const err = new Error("Bot not found");
    err.statusCode = 404;
    throw err;
  }
  return formatBot(bot);
}

async function createBot({
  userId,
  type,
  market,
  pair,
  investment,
  side,
  grids,
  low,
  high,
  name,
}) {
  const inv = Number(investment);
  if (!Number.isFinite(inv) || inv < 50) {
    const err = new Error("Minimum investment is $50 USDT");
    err.statusCode = 400;
    throw err;
  }
  if (!["Grid", "DCA"].includes(type)) {
    const err = new Error("type must be Grid or DCA");
    err.statusCode = 400;
    throw err;
  }
  const mkt = market === "Futures" ? "Futures" : "Spot";
  const cleanPair = String(pair || "BTC/USDT")
    .toUpperCase()
    .replace(/\s/g, "");
  const symbol = pairToSymbol(cleanPair.includes("/") ? cleanPair : `${cleanPair}/USDT`);
  const displayPair = cleanPair.includes("/")
    ? cleanPair
    : `${cleanPair.replace("USDT", "")}/USDT`;

  const { remaining, user } = await allocatableCapital(userId);
  if (!user || !user.isActive) {
    const err = new Error("User not found or inactive");
    err.statusCode = 401;
    throw err;
  }
  if (inv > remaining) {
    const err = new Error(
      remaining <= 0
        ? "No allocatable capital. Deposit USDT, buy a VIP level, or sync exchange capital first."
        : `Insufficient capital. Available: $${remaining.toFixed(2)} USDT`
    );
    err.statusCode = 400;
    throw err;
  }

  const count = await Bot.countDocuments({ user: userId, stopped: false });
  if (count >= 20) {
    const err = new Error("Maximum 20 active bots");
    err.statusCode = 400;
    throw err;
  }

  let entry = 1;
  try {
    entry = await getPrice(symbol, null);
  } catch {
    entry = 1;
  }

  const botSide = side === "short" ? "short" : "long";
  // Paper: allocate ~half investment as open position size
  const notional = inv * 0.5;
  const qty = notional / entry;

  const bot = await Bot.create({
    user: userId,
    name:
      name ||
      `${displayPair.split("/")[0]} ${type} Bot`,
    type,
    pair: displayPair,
    symbol,
    market: mkt,
    side: botSide,
    investment: inv,
    grids: grids != null ? Number(grids) : null,
    low: low != null ? Number(low) : null,
    high: high != null ? Number(high) : null,
    entry,
    current: entry,
    position: qty,
    pnl: 0,
    pnlPct: 0,
    unrealizedPnl: 0,
    running: true,
    stopped: false,
    startedAt: new Date(),
    lastActiveAt: new Date(),
    mode: "paper",
  });

  return {
    bot: formatBot(bot),
    mode: "paper",
    note:
      "PAPER MODE: bot tracks live Binance marks for demo PnL. No real exchange orders are placed.",
  };
}

async function pauseBot(userId, botId) {
  const bot = await Bot.findOne({ _id: botId, user: userId });
  if (!bot) {
    const err = new Error("Bot not found");
    err.statusCode = 404;
    throw err;
  }
  if (bot.stopped) {
    const err = new Error("Bot is stopped — use resume instead");
    err.statusCode = 400;
    throw err;
  }
  bot.running = !bot.running;
  bot.lastActiveAt = new Date();
  await bot.save();
  return formatBot(bot);
}

async function stopBot(userId, botId) {
  const bot = await Bot.findOne({ _id: botId, user: userId });
  if (!bot) {
    const err = new Error("Bot not found");
    err.statusCode = 404;
    throw err;
  }
  // Realize PnL at last mark
  try {
    const current = await getPrice(bot.symbol, bot.current);
    const { pnl, pnlPct } = calcPnl(bot.side, bot.entry, current, bot.position);
    bot.current = current;
    bot.pnl = pnl;
    bot.pnlPct = pnlPct;
    bot.unrealizedPnl = 0;
  } catch {
    // keep last
  }
  bot.running = false;
  bot.stopped = true;
  bot.stopMode = "Normally";
  bot.stoppedAt = new Date();
  bot.position = 0;
  bot.lastActiveAt = new Date();
  await bot.save();
  return formatBot(bot);
}

async function resumeBot(userId, botId) {
  const bot = await Bot.findOne({ _id: botId, user: userId });
  if (!bot) {
    const err = new Error("Bot not found");
    err.statusCode = 404;
    throw err;
  }
  if (!bot.stopped) {
    bot.running = true;
    bot.lastActiveAt = new Date();
    await bot.save();
    return formatBot(bot);
  }

  // Re-check capital for investment
  const { remaining } = await allocatableCapital(userId);
  // This bot's investment is not in remaining (it's stopped) — need room for it
  if (bot.investment > remaining) {
    const err = new Error(
      `Insufficient capital to restart. Available: $${remaining.toFixed(2)} USDT`
    );
    err.statusCode = 400;
    throw err;
  }

  let entry = bot.entry;
  try {
    entry = await getPrice(bot.symbol, bot.entry);
  } catch {
    // keep
  }
  const notional = bot.investment * 0.5;
  const qty = notional / entry;

  bot.entry = entry;
  bot.current = entry;
  bot.position = qty;
  bot.pnl = 0;
  bot.pnlPct = 0;
  bot.unrealizedPnl = 0;
  bot.running = true;
  bot.stopped = false;
  bot.stopMode = null;
  bot.stoppedAt = null;
  bot.startedAt = new Date();
  bot.lastActiveAt = new Date();
  await bot.save();
  return formatBot(bot);
}

module.exports = {
  listBots,
  getBot,
  createBot,
  pauseBot,
  stopBot,
  resumeBot,
  formatBot,
};
