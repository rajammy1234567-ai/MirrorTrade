import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "https://mirrortrade-api.onrender.com/api";

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

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  isActive: boolean;
  referralCode?: string | null;
  totalDeposit?: number;
  tVipRank?: string;
  cVipRank?: string;
  walletBalance?: number;
  createdAt?: string;
};

export type DashboardStats = {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  admins: number;
  totalDeposits?: number;
};
