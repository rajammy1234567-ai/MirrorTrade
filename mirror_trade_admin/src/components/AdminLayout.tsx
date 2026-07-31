import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api, type DashboardStats } from "../lib/api";

const NAV = [
  {
    to: "/",
    end: true,
    label: "Dashboard",
    badgeKey: null,
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z"
      />
    ),
  },
  {
    to: "/users",
    label: "Users",
    badgeKey: null,
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    ),
  },
  {
    to: "/deposits",
    label: "Deposits",
    badgeKey: "pendingDeposits" as const,
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4v16m8-8H4"
      />
    ),
  },
  {
    to: "/withdrawals",
    label: "Withdrawals",
    badgeKey: "pendingWithdrawals" as const,
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 14l-7 7m0 0l-7-7m7 7V3"
      />
    ),
  },
  {
    to: "/signals",
    label: "Signals",
    badgeKey: null,
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    ),
  },
  {
    to: "/traders",
    label: "Traders",
    badgeKey: null,
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    ),
  },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    const fetchStats = () => {
      api.get<{ success: boolean; stats: DashboardStats }>("/admin/stats")
        .then((res) => {
          if (res.data?.success) setStats(res.data.stats);
        })
        .catch(() => undefined);
    };
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 lg:flex">
      {/* Sidebar */}
      <aside className="border-b border-slate-800 bg-slate-950 text-white lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20">
              MT
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight text-white">MirrorTrade</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-400">
                Admin Console
              </p>
            </div>
          </div>
        </div>

        <nav className="flex gap-1.5 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible lg:px-3 lg:pb-0">
          {NAV.map((item) => {
            const count = item.badgeKey && stats ? Number(stats[item.badgeKey]) || 0 : 0;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex shrink-0 items-center justify-between rounded-xl px-3.5 py-3 text-sm font-semibold transition ${
                    isActive
                      ? "bg-amber-400/10 text-amber-400 border border-amber-400/30 shadow-sm"
                      : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <svg
                    className="h-5 w-5 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.75}
                  >
                    {item.icon}
                  </svg>
                  <span>{item.label}</span>
                </div>
                {count > 0 ? (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-slate-950">
                    {count}
                  </span>
                ) : null}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-auto hidden border-t border-slate-800 p-4 lg:block">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400/10 font-bold text-amber-400">
                {user?.name?.slice(0, 1).toUpperCase() || "A"}
              </div>
              <div className="overflow-hidden">
                <p className="truncate text-sm font-semibold text-white">
                  {user?.name || "Super Admin"}
                </p>
                <p className="truncate text-xs text-slate-400">{user?.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-800 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Live Admin Terminal
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-white">
                  {user?.name}
                </p>
                <p className="text-xs text-slate-400">{user?.email}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 lg:hidden"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 bg-slate-900 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
