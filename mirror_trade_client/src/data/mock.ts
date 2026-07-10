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
  running: boolean;
  runtime: string;
  pnl: number;
  pnlPct: number;
  investment: number;
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
    running: true,
    runtime: "3d 14h",
    pnl: 234.5,
    pnlPct: 4.7,
    investment: 5000,
  },
  {
    id: "b2",
    name: "ETH DCA Bot",
    type: "DCA",
    pair: "ETH/USDT",
    running: true,
    runtime: "7d 2h",
    pnl: 89.2,
    pnlPct: 2.1,
    investment: 4200,
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

export const exchanges = [
  {
    id: "binance",
    name: "Binance",
    short: "BINANCE",
    color: "#F0B90B",
    desc: "Spot & Futures trading",
    connected: true,
  },
  {
    id: "bybit",
    name: "Bybit",
    short: "BYBIT",
    color: "#F7A600",
    desc: "Spot & Futures trading",
    connected: false,
  },
  {
    id: "okx",
    name: "OKX",
    short: "OKX",
    color: "#FFFFFF",
    desc: "Spot & Futures trading",
    connected: false,
  },
];
