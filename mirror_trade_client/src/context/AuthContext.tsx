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
  loginRequest,
  meRequest,
  registerRequest,
  TOKEN_KEY,
  type AuthUser,
} from "../config/api";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  onboarded: boolean;
  exchangeConnected: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
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
    const bootstrap = async () => {
      try {
        const [[, token], [, rawOnboarded], [, rawExchange], [, rawUser]] =
          await AsyncStorage.multiGet([
            TOKEN_KEY,
            KEYS.onboarded,
            KEYS.exchange,
            KEYS.user,
          ]);

        setOnboarded(rawOnboarded === "1");
        setExchangeConnectedState(rawExchange === "1");

        if (!token) {
          if (rawUser) {
            // stale local profile without token
            await AsyncStorage.removeItem(KEYS.user);
          }
          return;
        }

        // Validate JWT with backend
        try {
          const me = await meRequest();
          if (me.success && me.user) {
            setUser(me.user);
            await AsyncStorage.setItem(KEYS.user, JSON.stringify(me.user));
            return;
          }
        } catch {
          // token invalid — fall back cleared below
        }

        await AsyncStorage.multiRemove([TOKEN_KEY, KEYS.user]);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const data = await loginRequest(email.trim(), password);
      if (!data.success || !data.token || !data.user) {
        throw new Error(data.message || "Login failed");
      }
      // Mobile app is for traders — admins use admin panel
      if (data.user.role === "admin") {
        throw new Error("Admin accounts must use the admin panel");
      }
      await persistSession(data.token, data.user);
      setUser(data.user);
    } catch (err) {
      throw new Error(getApiErrorMessage(err, "Login failed"));
    }
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      try {
        const data = await registerRequest(
          name.trim(),
          email.trim(),
          password
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
    const me = await meRequest();
    if (me.success && me.user) {
      setUser(me.user);
      await AsyncStorage.setItem(KEYS.user, JSON.stringify(me.user));
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
