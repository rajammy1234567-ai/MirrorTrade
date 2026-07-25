import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createBotRequest,
  executeSignalRequest,
  getApiErrorMessage,
  listBotsRequest,
  listSignalsRequest,
  pauseBotRequest,
  resumeBotRequest,
  stopBotRequest,
  type ApiBot,
  type ApiSignal,
} from "../config/api";
import { useAuth } from "./AuthContext";

/** Client bot shape used by Bots UI (matches API) */
export type Bot = {
  id: string;
  name: string;
  type: "Grid" | "DCA";
  pair: string;
  market: "Spot" | "Futures";
  running: boolean;
  stopped?: boolean;
  stopMode?: "Normally" | "Automatically";
  stoppedAt?: string;
  runtime: string;
  pnl: number;
  pnlPct: number;
  investment: number;
  position?: number;
  unrealizedPnl?: number;
  side?: "long" | "short";
  lastActiveHours?: number;
  mode?: string;
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

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  type: "trade" | "bot" | "system" | "signal";
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
  signals: Signal[];
  notifications: NotificationItem[];
  settings: AppSettings;
  unreadCount: number;
  botsLoading: boolean;
  signalsLoading: boolean;
  botsError: string;
  refreshBots: () => Promise<void>;
  refreshSignals: () => Promise<void>;
  pauseBot: (id: string) => Promise<void>;
  stopBot: (id: string) => Promise<void>;
  resumeStoppedBot: (id: string) => Promise<void>;
  createBot: (input: {
    name?: string;
    type: "Grid" | "DCA";
    market: "Spot" | "Futures";
    pair: string;
    investment: number;
    side?: "long" | "short";
    grids?: number;
    low?: number;
    high?: number;
  }) => Promise<Bot>;
  executeSignal: (id: string, amount?: number) => Promise<{ pair: string; direction: string } | null>;
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

const AppDataContext = createContext<AppDataValue | undefined>(undefined);

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function mapApiBot(b: ApiBot): Bot {
  return {
    id: b.id,
    name: b.name,
    type: b.type,
    pair: b.pair,
    market: b.market,
    running: b.running,
    stopped: b.stopped,
    stopMode: b.stopMode,
    stoppedAt: b.stoppedAt,
    runtime: b.runtime,
    pnl: b.pnl,
    pnlPct: b.pnlPct,
    investment: b.investment,
    position: b.position,
    unrealizedPnl: b.unrealizedPnl,
    side: b.side,
    lastActiveHours: b.lastActiveHours,
    mode: b.mode,
  };
}

function mapApiSignal(s: ApiSignal): Signal {
  return {
    id: s.id,
    provider: s.provider,
    pair: s.pair,
    direction: s.direction,
    entry: s.entry,
    target: s.target,
    stopLoss: s.stopLoss,
    time: s.time,
  };
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [bots, setBots] = useState<Bot[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [botsLoading, setBotsLoading] = useState(false);
  const [signalsLoading, setSignalsLoading] = useState(false);
  const [botsError, setBotsError] = useState("");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
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

  const refreshBots = useCallback(async () => {
    if (!user) {
      setBots([]);
      setBotsError("");
      return;
    }
    setBotsLoading(true);
    setBotsError("");
    try {
      const res = await listBotsRequest();
      if (res.success) setBots((res.data || []).map(mapApiBot));
    } catch (err) {
      setBotsError(getApiErrorMessage(err, "Failed to load bots"));
      setBots([]);
    } finally {
      setBotsLoading(false);
    }
  }, [user]);

  const refreshSignals = useCallback(async () => {
    setSignalsLoading(true);
    try {
      const res = await listSignalsRequest();
      if (res.success) setSignals((res.data || []).map(mapApiSignal));
    } catch {
      setSignals([]);
    } finally {
      setSignalsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSignals();
  }, [refreshSignals]);

  useEffect(() => {
    void refreshBots();
  }, [refreshBots]);

  const pauseBot = useCallback(
    async (id: string) => {
      const res = await pauseBotRequest(id);
      if (res.success && res.data) {
        const mapped = mapApiBot(res.data);
        setBots((prev) => prev.map((b) => (b.id === id ? mapped : b)));
        addNotification({
          title: mapped.running ? `${mapped.name} resumed` : `${mapped.name} paused`,
          body: mapped.running
            ? "Bot is live again (paper marks)."
            : "Bot stopped placing new paper fills.",
          time: "Just now",
          type: "bot",
        });
      }
    },
    [addNotification]
  );

  const stopBot = useCallback(
    async (id: string) => {
      const res = await stopBotRequest(id);
      if (res.success && res.data) {
        const mapped = mapApiBot(res.data);
        setBots((prev) => prev.map((b) => (b.id === id ? mapped : b)));
        addNotification({
          title: `${mapped.name} stopped`,
          body: `Final PnL ${mapped.pnl >= 0 ? "+" : ""}$${mapped.pnl.toFixed(2)}`,
          time: "Just now",
          type: "bot",
        });
      }
    },
    [addNotification]
  );

  const resumeStoppedBot = useCallback(
    async (id: string) => {
      const res = await resumeBotRequest(id);
      if (res.success && res.data) {
        const mapped = mapApiBot(res.data);
        setBots((prev) => {
          const rest = prev.filter((b) => b.id !== id);
          return [mapped, ...rest];
        });
        addNotification({
          title: `${mapped.name} restarted`,
          body: `${mapped.type} · ${mapped.market} · ${mapped.pair} is live again.`,
          time: "Just now",
          type: "bot",
        });
      }
    },
    [addNotification]
  );

  const createBot = useCallback(
    async (input: {
      name?: string;
      type: "Grid" | "DCA";
      market: "Spot" | "Futures";
      pair: string;
      investment: number;
      side?: "long" | "short";
      grids?: number;
      low?: number;
      high?: number;
    }) => {
      const res = await createBotRequest({
        type: input.type,
        market: input.market,
        pair: input.pair,
        investment: input.investment,
        side: input.side,
        grids: input.grids,
        low: input.low,
        high: input.high,
        name: input.name,
      });
      if (!res.success || !res.data?.bot) {
        throw new Error(res.message || "Failed to create bot");
      }
      const bot = mapApiBot(res.data.bot);
      setBots((prev) => [bot, ...prev]);
      addNotification({
        title: `${bot.name} launched`,
        body: `${bot.type} · ${bot.market} · ${bot.pair} · $${bot.investment.toLocaleString("en-US")} · paper`,
        time: "Just now",
        type: "bot",
      });
      return bot;
    },
    [addNotification]
  );

  const executeSignal = useCallback(
    async (id: string, amount = 100) => {
      const sig = signals.find((s) => s.id === id);
      const res = await executeSignalRequest(id, amount);
      if (!res.success) return null;
      addNotification({
        title: `Signal executed · ${sig?.pair || res.data.position.pair}`,
        body: `${(sig?.direction || res.data.position.side).toUpperCase()} · ${sig?.provider || res.data.position.source} · paper`,
        time: "Just now",
        type: "signal",
      });
      return {
        pair: res.data.position.pair,
        direction: res.data.position.side,
      };
    },
    [signals, addNotification]
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
      signals,
      notifications,
      settings,
      unreadCount,
      botsLoading,
      signalsLoading,
      botsError,
      refreshBots,
      refreshSignals,
      pauseBot,
      stopBot,
      resumeStoppedBot,
      createBot,
      executeSignal,
      markAllRead,
      markRead,
      updateSettings,
      addNotification,
    }),
    [
      bots,
      signals,
      notifications,
      settings,
      unreadCount,
      botsLoading,
      signalsLoading,
      botsError,
      refreshBots,
      refreshSignals,
      pauseBot,
      stopBot,
      resumeStoppedBot,
      createBot,
      executeSignal,
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
