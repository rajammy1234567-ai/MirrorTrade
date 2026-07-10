import axios, { type AxiosError } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

/**
 * API base URL
 * - Web / iOS simulator: localhost
 * - Android emulator: 10.0.2.2
 * - Physical phone: set EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:5000/api
 */
function resolveApiUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (Platform.OS === "android") {
    return "http://10.0.2.2:5000/api";
  }
  return "http://localhost:5000/api";
}

export const API_URL = resolveApiUrl();
export const TOKEN_KEY = "mt_token";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
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
  createdAt?: string;
};

export type AuthResponse = {
  success: boolean;
  token: string;
  user: AuthUser;
  message?: string;
};

export function getApiErrorMessage(err: unknown, fallback = "Something went wrong") {
  const ax = err as AxiosError<{ message?: string }>;
  return ax?.response?.data?.message || (err instanceof Error ? err.message : fallback);
}

export async function loginRequest(email: string, password: string) {
  const { data } = await api.post<AuthResponse>("/auth/login", { email, password });
  return data;
}

export async function registerRequest(
  name: string,
  email: string,
  password: string
) {
  const { data } = await api.post<AuthResponse>("/auth/register", {
    name,
    email,
    password,
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
