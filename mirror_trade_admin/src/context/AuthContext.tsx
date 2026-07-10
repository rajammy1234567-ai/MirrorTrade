import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, type AuthUser } from "../lib/api";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get("/auth/me");
        if (data.success && data.user.role === "admin") {
          setUser(data.user);
        } else {
          localStorage.removeItem("admin_token");
        }
      } catch {
        localStorage.removeItem("admin_token");
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password });

    if (!data.success) {
      throw new Error(data.message || "Login failed");
    }

    if (data.user.role !== "admin") {
      throw new Error("Admin access only");
    }

    localStorage.setItem("admin_token", data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("admin_token");
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
