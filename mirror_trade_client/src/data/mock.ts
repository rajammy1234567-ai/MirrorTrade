export type Trader = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  verified: boolean;
  winRate: number;
  roi30d: number;
  totalRoi: number;
  followers: number;
  copiers: number;
  risk: "Low" | "Medium" | "High";
  maxDrawdown: number;
  avgHold: string;
  equity: number[];
  bio: string;
};

export type Position = {
  id: string;
  source: string;
  sourceType: "trader" | "bot" | "signal";
  pair: string;
  side: "long" | "short";
  entry: number;
  current: number;
  pnl: number;
  pnlPct: number;
  status: "active" | "closed";
  closedDate?: string;
};

export type Bot = {
  id: string;
  name: string;
  type: "Grid" | "DCA";
  pair: string;
  /** Spot vs Futures book for Bot tab filters */
  market: "Spot" | "Futures";
  running: boolean;
  /** Fully stopped (shows under Stopped tab); paused bots stay under Running */
  stopped?: boolean;
  /** How the bot was closed — Stopped tab sub-filter */
  stopMode?: "Normally" | "Automatically";
  /** ISO-ish display time when bot was stopped (Record tab) */
  stoppedAt?: string;
  runtime: string;
  pnl: number;
  pnlPct: number;
  investment: number;
  /** Open position size (quote units) */
  position?: number;
  unrealizedPnl?: number;
  /** Futures side when market is Futures */
  side?: "long" | "short";
  /** Hours since last fill — used for Last 24H filter */
  lastActiveHours?: number;
};

export type Signal = {
  id: string;
  provider: string;
  pair: string;
  direction: "long" | "short";
  entry: number;
  target: number;
  stopLoss: number;
  time: string;
};

export type Trade = {
  pair: string;
  entry: number;
  exit: number;
  pnl: number;
  time: string;
  side: "long" | "short";
};

// Dense series are generated in chart components via chartData util.
// Keep light arrays for mini sparklines / fallbacks only.
export const SPARKLINE: number[] = [];

export const traders: Trader[] = [
  {
    id: "1",
    name: "Alex Mercer",
    handle: "@alexmercer",
    avatar: "AM",
    verified: true,
    winRate: 78,
    roi30d: 142.4,
    totalRoi: 680,
    followers: 12400,
    copiers: 1240,
    risk: "Low",
    maxDrawdown: 8.2,
    avgHold: "4.2h",
    equity: [],
    bio: "BTC & ETH swing specialist. Risk-managed positions with strict invalidation.",
  },
  {
    id: "2",
    name: "Sarah Kim",
    handle: "@sarahkim_btc",
    avatar: "SK",
    verified: true,
    winRate: 71,
    roi30d: 89.2,
    totalRoi: 410,
    followers: 8100,
    copiers: 890,
    risk: "Medium",
    maxDrawdown: 14.5,
    avgHold: "1d 2h",
    equity: [],
    bio: "Momentum trader focused on majors and high-liquidity alts.",
  },
  {
    id: "3",
    name: "Maya Chen",
    handle: "@mayachen",
    avatar: "MC",
    verified: true,
    winRate: 66,
    roi30d: 54.8,
    totalRoi: 290,
    followers: 5200,
    copiers: 640,
    risk: "Medium",
    maxDrawdown: 16.1,
    avgHold: "8h",
    equity: [],
    bio: "Intraday setups with tight risk and structured take-profit ladders.",
  },
  {
    id: "4",
    name: "Quiet Whale",
    handle: "@quietwhale",
    avatar: "QW",
    verified: true,
    winRate: 82,
    roi30d: 19.4,
    totalRoi: 220,
    followers: 22100,
    copiers: 3100,
    risk: "Low",
    maxDrawdown: 5.2,
    avgHold: "4d",
    equity: [],
    bio: "Conservative macro-aligned positions. Capital preservation first.",
  },
];

export const positions: Position[] = [
  {
    id: "p1",
    source: "Alex Mercer",
    sourceType: "trader",
    pair: "BTC/USDT",
    side: "long",
    entry: 43100,
    current: 44890,
    pnl: 1790,
    pnlPct: 4.2,
    status: "active",
  },
  {
    id: "p2",
    source: "Grid Bot #1",
    sourceType: "bot",
    pair: "ETH/USDT",
    side: "long",
    entry: 2220,
    current: 2280,
    pnl: 68,
    pnlPct: 2.7,
    status: "active",
  },
  {
    id: "p3",
    source: "Maya Chen",
    sourceType: "trader",
    pair: "SOL/USDT",
    side: "short",
    entry: 103,
    current: 98.5,
    pnl: -4.5,
    pnlPct: -4.4,
    status: "active",
  },
];

export const historyPositions: Position[] = [
  {
    id: "h1",
    source: "Alex Mercer",
    sourceType: "trader",
    pair: "BNB/USDT",
    side: "long",
    entry: 385,
    current: 402,
    pnl: 170,
    pnlPct: 4.4,
    status: "closed",
    closedDate: "Jul 5",
  },
  {
    id: "h2",
    source: "DCA Bot",
    sourceType: "bot",
    pair: "XRP/USDT",
    side: "long",
    entry: 0.62,
    current: 0.58,
    pnl: -40,
    pnlPct: -6.5,
    status: "closed",
    closedDate: "Jul 4",
  },
  {
    id: "h3",
    source: "Sarah Kim",
    sourceType: "trader",
    pair: "ADA/USDT",
    side: "long",
    entry: 0.48,
    current: 0.53,
    pnl: 50,
    pnlPct: 10.4,
    status: "closed",
    closedDate: "Jul 3",
  },
];

export const bots: Bot[] = [
  {
    id: "b1",
    name: "BTC Grid Bot",
    type: "Grid",
    pair: "BTC/USDT",
    market: "Spot",
    running: true,
    runtime: "3d 14h",
    pnl: 234.5,
    pnlPct: 4.7,
    investment: 5000,
    position: 0.012,
    unrealizedPnl: 18.4,
    lastActiveHours: 2,
  },
  {
    id: "b2",
    name: "ETH DCA Bot",
    type: "DCA",
    pair: "ETH/USDT",
    market: "Spot",
    running: true,
    runtime: "7d 2h",
    pnl: 89.2,
    pnlPct: 2.1,
    investment: 4200,
    position: 1.25,
    unrealizedPnl: 6.8,
    lastActiveHours: 8,
  },
  {
    id: "b3",
    name: "SOL Futures Grid",
    type: "Grid",
    pair: "SOL/USDT",
    market: "Futures",
    side: "long",
    running: true,
    runtime: "1d 6h",
    pnl: 39.295,
    pnlPct: 3.9,
    investment: 1000,
    position: 12,
    unrealizedPnl: 12.1,
    lastActiveHours: 1,
  },
  {
    id: "b4",
    name: "XRP Grid Bot",
    type: "Grid",
    pair: "XRP/USDT",
    market: "Spot",
    running: false,
    stopped: true,
    stopMode: "Normally",
    stoppedAt: "2026-07-18 14:22",
    runtime: "12d 4h",
    pnl: 156.0,
    pnlPct: 5.2,
    investment: 3000,
    position: 0,
    unrealizedPnl: 0,
    lastActiveHours: 120,
  },
  {
    id: "b5",
    name: "BNB DCA Bot",
    type: "DCA",
    pair: "BNB/USDT",
    market: "Futures",
    side: "short",
    running: false,
    stopped: true,
    stopMode: "Automatically",
    stoppedAt: "2026-07-20 09:05",
    runtime: "5d 9h",
    pnl: -42.5,
    pnlPct: -1.4,
    investment: 2800,
    position: 0,
    unrealizedPnl: 0,
    lastActiveHours: 72,
  },
];

export const signals: Signal[] = [
  {
    id: "s1",
    provider: "Nova Desk",
    pair: "BTC/USDT",
    direction: "long",
    entry: 65800,
    target: 68500,
    stopLoss: 64200,
    time: "12m ago",
  },
  {
    id: "s2",
    provider: "Pulse FX",
    pair: "ETH/USDT",
    direction: "short",
    entry: 3290,
    target: 3120,
    stopLoss: 3365,
    time: "38m ago",
  },
  {
    id: "s3",
    provider: "Orbit Alpha",
    pair: "SOL/USDT",
    direction: "long",
    entry: 146.5,
    target: 158.0,
    stopLoss: 141.2,
    time: "1h ago",
  },
  {
    id: "s4",
    provider: "Nova Desk",
    pair: "BNB/USDT",
    direction: "long",
    entry: 582,
    target: 610,
    stopLoss: 568,
    time: "3h ago",
  },
];

export const recentTrades: Trade[] = [
  {
    pair: "BTC/USDT",
    entry: 41200,
    exit: 43850,
    pnl: 6.4,
    time: "2h ago",
    side: "long",
  },
  {
    pair: "ETH/USDT",
    entry: 2180,
    exit: 2340,
    pnl: 7.3,
    time: "5h ago",
    side: "long",
  },
  {
    pair: "SOL/USDT",
    entry: 102.5,
    exit: 99.8,
    pnl: -2.6,
    time: "8h ago",
    side: "short",
  },
  {
    pair: "BNB/USDT",
    entry: 580,
    exit: 605,
    pnl: 4.1,
    time: "1d ago",
    side: "long",
  },
];

export const portfolio = {
  totalValue: 10240.85,
  todayPnl: 284.5,
  todayPnlPct: 2.86,
  allTimePnl: 2140.85,
  openPositions: 3,
  wins: 28,
  losses: 8,
  winRate: 78,
  sparkline: SPARKLINE,
  chartLabels: ["Jun 1", "Jun 14", "Jun 28", "Jul 7"],
  /** seed for TradingChart random-walk */
  chartSeed: 42,
  chartStart: 8960,
};

/**
 * Supported CEX catalog for API Connect.
 * `id` must match server ExchangeCredential.exchange / serviceMap keys.
 */
export type ExchangeCatalogItem = {
  id: string;
  name: string;
  short: string;
  color: string;
  domain: string;
  spot: string;
  futures: string;
  tags: string[];
  hot?: boolean;
  quick?: boolean;
  needsPassphrase?: boolean;
  passphraseLabel?: string;
  latestListing?: string;
  latestListingDate?: string;
  statusHint?: string;
  quote?: "USDT" | "USDC" | "BOTH";
};

export const exchanges: ExchangeCatalogItem[] = [
  {
    id: "bingx",
    name: "BingX",
    short: "BX",
    color: "#2562FF",
    domain: "bingx.com",
    spot: "403",
    futures: "271",
    tags: ["USDT"],
    statusHint: "API is normal,but only enable futures.",
    quote: "BOTH",
  },
  {
    id: "binance",
    name: "Binance",
    short: "BN",
    color: "#F0B90B",
    domain: "binance.com",
    spot: "423",
    futures: "636",
    tags: ["USDT"],
    hot: true,
    latestListing: "SKHY/USDT",
    latestListingDate: "2026-07-13",
    quote: "BOTH",
  },
  {
    id: "okx",
    name: "OKX",
    short: "OKX",
    color: "#111111",
    domain: "okx.com",
    spot: "286",
    futures: "392",
    tags: ["USDT", "Quick"],
    quick: true,
    needsPassphrase: true,
    passphraseLabel: "Passphrase",
    latestListing: "SKHY/USDT",
    latestListingDate: "2026-07-13",
    quote: "BOTH",
  },
  {
    id: "bybit",
    name: "Bybit",
    short: "BYB",
    color: "#F7A600",
    domain: "bybit.com",
    spot: "383",
    futures: "594",
    tags: ["USDT", "Quick"],
    quick: true,
    quote: "BOTH",
  },
  {
    id: "mexc",
    name: "MEXC",
    short: "MX",
    color: "#1672F8",
    domain: "mexc.com",
    spot: "580",
    futures: "468",
    tags: ["USDT"],
    latestListing: "JUGGERNAUT/USDT",
    latestListingDate: "2026-07-14",
    quote: "BOTH",
  },
  {
    id: "bitmart",
    name: "BitMart",
    short: "BM",
    color: "#03E0B5",
    domain: "bitmart.com",
    spot: "359",
    futures: "193",
    tags: ["USDT"],
    needsPassphrase: true,
    passphraseLabel: "API Memo",
    quote: "USDT",
  },
  {
    id: "bitfinex",
    name: "Bitfinex",
    short: "BFX",
    color: "#00A478",
    domain: "bitfinex.com",
    spot: "28",
    futures: "52",
    tags: ["USDT"],
    quote: "USDT",
  },
  {
    id: "kraken",
    name: "Kraken Spot",
    short: "KR",
    color: "#5741D9",
    domain: "kraken.com",
    spot: "29",
    futures: "--",
    tags: ["USDT"],
    quote: "BOTH",
  },
  {
    id: "kraken_futures",
    name: "Kraken Futures",
    short: "KR",
    color: "#5741D9",
    domain: "kraken.com",
    spot: "--",
    futures: "99",
    tags: ["USDT"],
    quote: "USDT",
  },
  {
    id: "binance_us",
    name: "Binance US",
    short: "BN",
    color: "#F0B90B",
    domain: "binance.us",
    spot: "154",
    futures: "--",
    tags: ["USDT"],
    quote: "USDT",
  },
];
