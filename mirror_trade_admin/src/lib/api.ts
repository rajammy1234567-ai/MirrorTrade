import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL || "https://mirrortrade-api.onrender.com/api";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function getErrorMessage(err: unknown, fallback = "Something went wrong") {
  if (err && typeof err === "object" && "response" in err) {
    const res = (err as { response?: { data?: { message?: string } } }).response;
    if (res?.data?.message) return res.data.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: "user" | "admin";
  isActive: boolean;
  isEmailVerified?: boolean;
  referralCode?: string | null;
  totalDeposit?: number;
  usdtBalance?: number;
  exchangeCapital?: number;
  capitalSource?: string;
  capitalSyncedAt?: string | null;
  primaryExchange?: string | null;
  tVipRank?: string;
  cVipRank?: string;
  walletBalance?: number;
  referralRewardsEarned?: number;
  createdAt?: string;
};

export type DashboardStats = {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  admins: number;
  totalDeposits?: number;
  totalLevelCapital?: number;
  totalUsdtBalance?: number;
  totalEarnings?: number;
  totalExchangeCapital?: number;
  pendingDeposits?: number;
  creditedDeposits?: number;
  pendingWithdrawals?: number;
  paidWithdrawals?: number;
  pendingDepositVolume?: number;
  pendingWithdrawVolume?: number;
  currency?: string;
  unit?: string;
};

export type DepositRow = {
  id: string;
  amountUsdt: number;
  amountBnb?: number | null;
  coin?: string;
  network?: string;
  depositAddress?: string;
  txHash?: string | null;
  status: "pending" | "credited" | "rejected" | string;
  note?: string;
  creditedAt?: string | null;
  createdAt?: string;
  user?: { id: string; name: string; email: string } | null;
};

export type WithdrawRow = {
  id: string;
  amount: number;
  currency?: string;
  payoutAddress: string;
  network?: string;
  status: "pending" | "paid" | "rejected" | string;
  note?: string;
  processedAt?: string | null;
  createdAt?: string;
  user?: { id: string; name: string; email: string } | null;
};
