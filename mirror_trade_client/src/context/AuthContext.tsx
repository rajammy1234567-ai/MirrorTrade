import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getApiErrorMessage,
  isNetworkError,
  isUnauthorized,
  loginRequest,
  meRequest,
  registerRequest,
  TOKEN_KEY,
  withTimeout,
  type AuthUser,
} from "../config/api";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  onboarded: boolean;
  exchangeConnected: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    referralCode?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  setExchangeConnected: (value: boolean) => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const KEYS = {
  user: "mt_user",
  onboarded: "mt_onboarded",
  exchange: "mt_exchange",
};

async function persistSession(token: string, user: AuthUser) {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [KEYS.user, JSON.stringify(user)],
  ]);
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [onboarded, setOnboarded] = useState(false);
  const [exchangeConnected, setExchangeConnectedState] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const [[, token], [, rawOnboarded], [, rawExchange], [, rawUser]] =
          await AsyncStorage.multiGet([
            TOKEN_KEY,
            KEYS.onboarded,
            KEYS.exchange,
            KEYS.user,
          ]);

        if (cancelled) return;

        setOnboarded(rawOnboarded === "1");
        setExchangeConnectedState(rawExchange === "1");

        // Show cached user immediately so UI is not blank
        let cached: AuthUser | null = null;
        if (rawUser) {
          try {
            cached = JSON.parse(rawUser) as AuthUser;
            if (cached?.id) setUser(cached);
          } catch {
            cached = null;
          }
        }

        if (!token) {
          if (rawUser) await AsyncStorage.removeItem(KEYS.user);
          if (!cancelled) setUser(null);
          return;
        }

        // Validate token — hard cap so splash never hangs
        try {
          const me = await withTimeout(meRequest(), 5000);
          if (cancelled) return;
          if (me.success && me.user) {
            setUser(me.user);
            await AsyncStorage.setItem(KEYS.user, JSON.stringify(me.user));
            return;
          }
        } catch (err) {
          // Network/timeout: keep cached session so app is usable offline-ish
          if (isNetworkError(err) && cached) {
            return;
          }
          // Only clear session on real auth failure
          if (isUnauthorized(err)) {
            await AsyncStorage.multiRemove([TOKEN_KEY, KEYS.user]);
            if (!cancelled) setUser(null);
            return;
          }
          // Other errors — keep cache if present
          if (cached) return;
          await AsyncStorage.multiRemove([TOKEN_KEY, KEYS.user]);
          if (!cancelled) setUser(null);
        }
      } catch {
        // storage crash — still stop loading
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    // Absolute safety: never show spinner more than 6s
    const hardStop = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 6000);

    bootstrap().finally(() => clearTimeout(hardStop));

    return () => {
      cancelled = true;
      clearTimeout(hardStop);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const data = await withTimeout(loginRequest(email.trim(), password), 10000);
      if (!data.success || !data.token || !data.user) {
        throw new Error(data.message || "Login failed");
      }
      if (data.user.role === "admin") {
        throw new Error("Admin accounts must use the admin panel");
      }
      await persistSession(data.token, data.user);
      setUser(data.user);
      // Returning users skip forced onboarding gate
      const raw = await AsyncStorage.getItem(KEYS.onboarded);
      if (raw !== "1") {
        await AsyncStorage.setItem(KEYS.onboarded, "1");
        setOnboarded(true);
      }
    } catch (err) {
      throw new Error(getApiErrorMessage(err, "Login failed"));
    }
  }, []);

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      referralCode?: string
    ) => {
      try {
        const data = await withTimeout(
          registerRequest(name.trim(), email.trim(), password, referralCode),
          10000
        );
        if (!data.success || !data.token || !data.user) {
          throw new Error(data.message || "Registration failed");
        }
        await persistSession(data.token, data.user);
        setUser(data.user);
      } catch (err) {
        throw new Error(getApiErrorMessage(err, "Registration failed"));
      }
    },
    []
  );

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove([
      TOKEN_KEY,
      KEYS.user,
      KEYS.onboarded,
      KEYS.exchange,
    ]);
    setUser(null);
    setOnboarded(false);
    setExchangeConnectedState(false);
  }, []);

  const completeOnboarding = useCallback(async () => {
    await AsyncStorage.setItem(KEYS.onboarded, "1");
    setOnboarded(true);
  }, []);

  const setExchangeConnected = useCallback(async (value: boolean) => {
    await AsyncStorage.setItem(KEYS.exchange, value ? "1" : "0");
    setExchangeConnectedState(value);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await withTimeout(meRequest(), 5000);
      if (me.success && me.user) {
        setUser(me.user);
        await AsyncStorage.setItem(KEYS.user, JSON.stringify(me.user));
      }
    } catch {
      // keep existing user on refresh fail
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      onboarded,
      exchangeConnected,
      login,
      register,
      logout,
      completeOnboarding,
      setExchangeConnected,
      refreshUser,
    }),
    [
      user,
      loading,
      onboarded,
      exchangeConnected,
      login,
      register,
      logout,
      completeOnboarding,
      setExchangeConnected,
      refreshUser,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
