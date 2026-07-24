import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  bots as seedBots,
  historyPositions as seedHistory,
  positions as seedPositions,
  signals as seedSignals,
  type Bot,
  type Position,
  type Signal,
} from "../data/mock";

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  type: "trade" | "bot" | "system" | "signal";
};

export type CopiedTrader = {
  traderId: string;
  amount: number;
  maxDd: number;
  multiplier: number;
  copyOpen: boolean;
  startedAt: string;
};

export type AppSettings = {
  tradeNotifications: boolean;
  signalAlerts: boolean;
  emailDigest: boolean;
  language: string;
  region: string;
  defaultLeverage: number;
  confirmOrders: boolean;
  twoFAEnabled: boolean;
};

type AppDataValue = {
  bots: Bot[];
  positions: Position[];
  history: Position[];
  signals: Signal[];
  notifications: NotificationItem[];
  copied: CopiedTrader[];
  settings: AppSettings;
  unreadCount: number;
  pauseBot: (id: string) => void;
  stopBot: (id: string) => void;
  /** Restart a stopped bot back into Running (no create flow) */
  resumeStoppedBot: (id: string) => void;
  createBot: (
    bot: Omit<Bot, "id" | "runtime" | "pnl" | "pnlPct" | "running" | "stopped">
  ) => Bot;
  closePosition: (id: string) => void;
  executeSignal: (id: string) => Position | null;
  startCopy: (copy: Omit<CopiedTrader, "startedAt">) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  addNotification: (n: Omit<NotificationItem, "id" | "read">) => void;
};

const defaultSettings: AppSettings = {
  tradeNotifications: true,
  signalAlerts: true,
  emailDigest: false,
  language: "English",
  region: "Global (USDT)",
  defaultLeverage: 3,
  confirmOrders: true,
  twoFAEnabled: true,
};

const seedNotifications: NotificationItem[] = [
  {
    id: "n1",
    title: "BTC Grid Bot filled",
    body: "Buy order filled at $43,820 · +0.4%",
    time: "4m ago",
    read: false,
    type: "bot",
  },
  {
    id: "n2",
    title: "New signal · Nova Desk",
    body: "BTC/USDT long setup published",
    time: "18m ago",
    read: false,
    type: "signal",
  },
  {
    id: "n3",
    title: "Copy trade opened",
    body: "Alex Mercer opened ETH/USDT long — mirrored",
    time: "1h ago",
    read: false,
    type: "trade",
  },
  {
    id: "n4",
    title: "Weekly performance",
    body: "Portfolio +2.86% this week. Keep risk tight.",
    time: "Yesterday",
    read: true,
    type: "system",
  },
  {
    id: "n5",
    title: "Drawdown watch",
    body: "SOL short is -4.4%. Max stop not hit yet.",
    time: "Yesterday",
    read: true,
    type: "trade",
  },
];

const AppDataContext = createContext<AppDataValue | undefined>(undefined);

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [bots, setBots] = useState<Bot[]>(seedBots);
  const [positions, setPositions] = useState<Position[]>(seedPositions);
  const [history, setHistory] = useState<Position[]>(seedHistory);
  const [signals] = useState<Signal[]>(seedSignals);
  const [notifications, setNotifications] =
    useState<NotificationItem[]>(seedNotifications);
  const [copied, setCopied] = useState<CopiedTrader[]>([
    {
      traderId: "1",
      amount: 500,
      maxDd: 20,
      multiplier: 1,
      copyOpen: false,
      startedAt: "3d ago",
    },
  ]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const addNotification = useCallback(
    (n: Omit<NotificationItem, "id" | "read">) => {
      setNotifications((prev) => [
        { ...n, id: uid("n"), read: false },
        ...prev,
      ]);
    },
    []
  );

  const pauseBot = useCallback(
    (id: string) => {
      const bot = bots.find((b) => b.id === id);
      if (bot?.stopped) return;
      setBots((prev) =>
        prev.map((b) =>
          b.id === id
            ? {
                ...b,
                running: !b.running,
                runtime: b.running
                  ? "Paused"
                  : b.runtime === "Paused"
                    ? "0h"
                    : b.runtime,
              }
            : b
        )
      );
      if (bot) {
        addNotification({
          title: bot.running ? `${bot.name} paused` : `${bot.name} resumed`,
          body: bot.running
            ? "Bot stopped placing new orders."
            : "Bot is live again.",
          time: "Just now",
          type: "bot",
        });
      }
    },
    [bots, addNotification]
  );

  const stopBot = useCallback(
    (id: string) => {
      const bot = bots.find((b) => b.id === id);
      const now = new Date();
      const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      setBots((prev) =>
        prev.map((b) =>
          b.id === id
            ? {
                ...b,
                running: false,
                stopped: true,
                stopMode: "Normally" as const,
                stoppedAt: stamp,
                position: 0,
                unrealizedPnl: 0,
                lastActiveHours: 0,
              }
            : b
        )
      );
      if (bot) {
        addNotification({
          title: `${bot.name} stopped`,
          body: `Final PnL ${bot.pnl >= 0 ? "+" : ""}$${bot.pnl.toFixed(2)}`,
          time: "Just now",
          type: "bot",
        });
      }
    },
    [bots, addNotification]
  );

  const resumeStoppedBot = useCallback(
    (id: string) => {
      const bot = bots.find((b) => b.id === id);
      if (!bot?.stopped) return;
      setBots((prev) =>
        prev.map((b) =>
          b.id === id
            ? {
                ...b,
                stopped: false,
                running: true,
                stopMode: undefined,
                stoppedAt: undefined,
                runtime: "0h",
                lastActiveHours: 0,
              }
            : b
        )
      );
      if (bot) {
        addNotification({
          title: `${bot.name} restarted`,
          body: `${bot.type} · ${bot.market} · ${bot.pair} is live again.`,
          time: "Just now",
          type: "bot",
        });
      }
    },
    [bots, addNotification]
  );

  /** Kept for future algo wiring — not exposed in Bot UI for now */
  const createBot = useCallback(
    (input: Omit<Bot, "id" | "runtime" | "pnl" | "pnlPct" | "running" | "stopped">) => {
      const bot: Bot = {
        ...input,
        market: input.market ?? "Spot",
        id: uid("b"),
        running: true,
        stopped: false,
        runtime: "0h",
        pnl: 0,
        pnlPct: 0,
        position: 0,
        unrealizedPnl: 0,
        lastActiveHours: 0,
      };
      setBots((prev) => [bot, ...prev]);
      addNotification({
        title: `${bot.name} launched`,
        body: `${bot.type} · ${bot.market} · ${bot.pair} · $${bot.investment.toLocaleString("en-US")}`,
        time: "Just now",
        type: "bot",
      });
      return bot;
    },
    [addNotification]
  );

  const closePosition = useCallback(
    (id: string) => {
      setPositions((prev) => {
        const pos = prev.find((p) => p.id === id);
        if (!pos) return prev;
        const closed: Position = {
          ...pos,
          status: "closed",
          closedDate: "Today",
        };
        setHistory((h) => [closed, ...h]);
        addNotification({
          title: `Closed ${pos.pair}`,
          body: `PnL ${pos.pnl >= 0 ? "+" : ""}$${pos.pnl.toFixed(2)} (${pos.pnlPct}%)`,
          time: "Just now",
          type: "trade",
        });
        return prev.filter((p) => p.id !== id);
      });
    },
    [addNotification]
  );

  const executeSignal = useCallback(
    (id: string) => {
      const sig = signals.find((s) => s.id === id);
      if (!sig) return null;
      const pos: Position = {
        id: uid("p"),
        source: sig.provider,
        sourceType: "signal",
        pair: sig.pair,
        side: sig.direction,
        entry: sig.entry,
        current: sig.entry,
        pnl: 0,
        pnlPct: 0,
        status: "active",
      };
      setPositions((prev) => [pos, ...prev]);
      addNotification({
        title: `Signal executed · ${sig.pair}`,
        body: `${sig.direction.toUpperCase()} @ ${sig.entry} · ${sig.provider}`,
        time: "Just now",
        type: "signal",
      });
      return pos;
    },
    [signals, addNotification]
  );

  const startCopy = useCallback(
    (copy: Omit<CopiedTrader, "startedAt">) => {
      setCopied((prev) => {
        const rest = prev.filter((c) => c.traderId !== copy.traderId);
        return [{ ...copy, startedAt: "Just now" }, ...rest];
      });
      addNotification({
        title: "Copy trading started",
        body: `Allocating $${copy.amount.toLocaleString("en-US")} · ${copy.multiplier}x size`,
        time: "Just now",
        type: "trade",
      });
    },
    [addNotification]
  );

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const value = useMemo(
    () => ({
      bots,
      positions,
      history,
      signals,
      notifications,
      copied,
      settings,
      unreadCount,
      pauseBot,
      stopBot,
      resumeStoppedBot,
      createBot,
      closePosition,
      executeSignal,
      startCopy,
      markAllRead,
      markRead,
      updateSettings,
      addNotification,
    }),
    [
      bots,
      positions,
      history,
      signals,
      notifications,
      copied,
      settings,
      unreadCount,
      pauseBot,
      stopBot,
      resumeStoppedBot,
      createBot,
      closePosition,
      executeSignal,
      startCopy,
      markAllRead,
      markRead,
      updateSettings,
      addNotification,
    ]
  );

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
