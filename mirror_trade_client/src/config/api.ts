import axios, { type AxiosError } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Always use the deployed MirrorTrade API.
 * Local override only when EXPO_PUBLIC_USE_LOCAL_API=1 AND EXPO_PUBLIC_API_URL is set.
 */
const DEPLOYED_API = "https://mirrortrade-api.onrender.com/api";

function resolveApiUrl() {
  const useLocal = process.env.EXPO_PUBLIC_USE_LOCAL_API === "1";
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, "");

  if (useLocal && fromEnv) {
    return fromEnv;
  }

  // Never silently use localhost — always deployed unless USE_LOCAL_API=1
  if (fromEnv && !/localhost|127\.0\.0\.1|10\.0\.2\.2/.test(fromEnv)) {
    return fromEnv;
  }

  return DEPLOYED_API;
}

export const API_URL = resolveApiUrl();
export const DEFAULT_API_URL = DEPLOYED_API;
export const TOKEN_KEY = "mt_token";

/**
 * Timeout: long enough for Render free-tier cold start (~30–50s).
 */
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 45000,
});

// Belt-and-suspenders: force baseURL even if a stale bundle tried something else
api.defaults.baseURL = API_URL;

api.interceptors.request.use(async (config) => {
  // Always hit deployed API unless local override is active
  config.baseURL = API_URL;
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // storage unavailable — continue without token
  }
  return config;
});

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  isActive: boolean;
  referralCode?: string | null;
  totalDeposit?: number;
  capitalSource?: "none" | "exchange" | "admin";
  capitalSyncedAt?: string | null;
  primaryExchange?: string | null;
  tVipRank?: string;
  cVipRank?: string;
  walletBalance?: number;
  createdAt?: string;
};

export type AuthResponse = {
  success: boolean;
  token: string;
  user: AuthUser;
  message?: string;
};

export type TVipPlan = {
  rank: string;
  minDeposit: number;
  profitSharePercent: number;
};

export type CVipPlan = {
  rank: string;
  minDeposit: number;
  minDirects: number;
  minTeamBusiness: number;
};

export type ProgressMetric = {
  current: number;
  target: number;
  met?: boolean;
  percent: number;
};

export type PlanStatus = {
  totalDeposit: number;
  exchangeCapital?: number;
  capitalSource?: string;
  capitalSyncedAt?: string | null;
  primaryExchange?: string | null;
  walletBalance: number;
  tVipRank: string;
  cVipRank: string;
  tVipProfitSharePercent: number;
  referralCode: string;
  directs: number;
  teamBusiness: number;
  nextTVip: TVipPlan | null;
  nextCVip: CVipPlan | null;
  tVipProgress?: ProgressMetric;
  cVipProgress?: {
    deposit: ProgressMetric;
    directs: ProgressMetric;
    teamBusiness: ProgressMetric;
  } | null;
  model?: {
    inAppPayments: boolean;
    capitalFromExchange: boolean;
    note: string;
  };
  bonuses?: {
    sameLevelBonus?: Record<string, number>;
    globalDevRankBonus?: Record<string, number>;
  };
  plans: {
    tVip: TVipPlan[];
    cVip: CVipPlan[];
  };
};

export type PlanTransaction = {
  id: string;
  type: string;
  amount: number;
  rankAtTime?: string | null;
  percentApplied?: number | null;
  note?: string;
  createdAt: string;
};

export type ExchangeConnection = {
  id: string;
  exchange: string;
  permissions: {
    spotTrading?: boolean;
    futuresTrading?: boolean;
    withdrawals?: boolean;
  };
  status: string;
  lastVerifiedAt?: string;
  lastError?: string | null;
  lastCapital?: number | null;
  capitalSyncedAt?: string | null;
  createdAt?: string;
};

export type CapitalSnapshot = {
  totalDeposit: number;
  exchangeCapital?: number;
  tVipRank: string;
  cVipRank: string;
  directs: number;
  teamBusiness: number;
  capitalSource?: string;
  capitalSyncedAt?: string | null;
  primaryExchange?: string | null;
};

export function getApiErrorMessage(err: unknown, fallback = "Something went wrong") {
  const ax = err as AxiosError<{ message?: string }>;
  const isLocal = /localhost|127\.0\.0\.1|10\.0\.2\.2/.test(API_URL);
  if (ax?.code === "ECONNABORTED" || ax?.message?.includes("timeout")) {
    return isLocal
      ? "Server timeout — is mirror_trade_server running on port 7000?"
      : "Server timeout — deployed API is slow or waking up. Retry in a few seconds.";
  }
  if (ax?.code === "ERR_NETWORK" || !ax?.response) {
    return isLocal
      ? `Cannot reach API (${API_URL}). Start mirror_trade_server.`
      : `Cannot reach API (${API_URL}). Check internet, or wait if Render free tier is waking up.`;
  }
  return ax?.response?.data?.message || (err instanceof Error ? err.message : fallback);
}

export function isUnauthorized(err: unknown) {
  return (err as AxiosError)?.response?.status === 401;
}

export function isNetworkError(err: unknown) {
  const ax = err as AxiosError;
  return !ax?.response || ax.code === "ERR_NETWORK" || ax.code === "ECONNABORTED";
}

function isRouteMissing(err: unknown) {
  return (err as AxiosError)?.response?.status === 404;
}

/** Race a promise so screens never hang past maxMs (Render cold start needs headroom) */
export function withTimeout<T>(promise: Promise<T>, maxMs = 50000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Request timed out")), maxMs);
    promise
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(t);
        reject(e);
      });
  });
}

export async function loginRequest(email: string, password: string) {
  const { data } = await api.post<AuthResponse>("/auth/login", { email, password });
  return data;
}

export async function registerRequest(
  name: string,
  email: string,
  password: string,
  referralCode?: string
) {
  const { data } = await api.post<AuthResponse>("/auth/register", {
    name,
    email,
    password,
    ...(referralCode?.trim() ? { referralCode: referralCode.trim() } : {}),
  });
  return data;
}

export async function meRequest() {
  const { data } = await api.get<{ success: boolean; user: AuthUser }>("/auth/me");
  return data;
}

export async function healthRequest() {
  const { data } = await api.get<{ success: boolean; message: string }>("/health");
  return data;
}

export async function getPlansRequest() {
  const { data } = await api.get<{
    success: boolean;
    data: {
      tVip: TVipPlan[];
      cVip: CVipPlan[];
      bonuses: Record<string, unknown>;
      company: Record<string, number>;
    };
  }>("/plans");
  return data;
}

export async function getMyPlanStatusRequest() {
  const { data } = await api.get<{ success: boolean; data: PlanStatus }>("/plans/me");
  return data;
}

export async function getMyTransactionsRequest(limit = 30) {
  const { data } = await api.get<{
    success: boolean;
    count: number;
    data: PlanTransaction[];
  }>("/plans/transactions", { params: { limit } });
  return data;
}

export async function listExchangesRequest() {
  try {
    const { data } = await api.get<{
      success: boolean;
      data: ExchangeConnection[];
    }>("/exchanges");
    return data;
  } catch (err) {
    if (isRouteMissing(err) || isNetworkError(err)) {
      return { success: true, data: [] as ExchangeConnection[] };
    }
    throw err;
  }
}

export async function connectExchangeRequest(payload: {
  exchange: string;
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
}) {
  try {
    const { data } = await api.post<{
      success: boolean;
      message: string;
      data: {
        connection: ExchangeConnection;
        capital: CapitalSnapshot | null;
        capitalError: string | null;
      };
    }>("/exchanges/connect", payload);
    return data;
  } catch (err) {
    if (isRouteMissing(err)) {
      throw new Error(
        "Exchange API not on this server. Redeploy the latest mirror_trade_server."
      );
    }
    throw err;
  }
}

export async function syncExchangeCapitalRequest(exchange?: string) {
  try {
    const { data } = await api.post<{
      success: boolean;
      message: string;
      data: {
        exchanges: Array<{
          exchange: string;
          capital: number;
          ok: boolean;
          error?: string;
        }>;
        capital: CapitalSnapshot;
      };
    }>("/exchanges/sync-capital", exchange ? { exchange } : {});
    return data;
  } catch (err) {
    if (isRouteMissing(err)) {
      throw new Error(
        "Capital sync not available on this server. Redeploy the latest mirror_trade_server."
      );
    }
    throw err;
  }
}

export async function disconnectExchangeRequest(exchange: string) {
  try {
    const { data } = await api.delete<{ success: boolean; message: string }>(
      `/exchanges/${exchange}`
    );
    return data;
  } catch (err) {
    if (isRouteMissing(err)) {
      throw new Error("Exchange API not available on this server.");
    }
    throw err;
  }
}

export async function startCopyRequest(
  traderId: string,
  amount: number,
  maxDd: number,
  multiplier: number,
  copyOpen: boolean
) {
  const { data } = await api.post<{
    success: boolean;
    message: string;
    data: unknown;
  }>("/trade/copy", {
    traderId,
    amount,
    maxDd,
    multiplier,
    copyOpen,
  });
  return data;
}
