import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import {
  api,
  getErrorMessage,
  type DashboardStats,
  type DepositRow,
  type WithdrawRow,
} from "../lib/api";
import { formatDate, formatMoney, shortHash } from "../lib/currency";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingDeposits, setPendingDeposits] = useState<DepositRow[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<WithdrawRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [statsRes, depRes, wdRes] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/deposits", { params: { status: "pending" } }),
        api.get("/admin/withdrawals", { params: { status: "pending" } }),
      ]);
      setStats(statsRes.data.data);
      setPendingDeposits((depRes.data.data || []).slice(0, 5));
      setPendingWithdrawals((wdRes.data.data || []).slice(0, 5));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load dashboard"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cards = [
    {
      label: "Total Registered Users",
      value: stats?.totalUsers ?? 0,
      hint: `${stats?.activeUsers ?? 0} active users`,
      tone: "from-amber-400 to-amber-500",
      badge: "USERS",
    },
    {
      label: "USDT Principal Capital",
      value: formatMoney(stats?.totalUsdtBalance ?? stats?.totalDeposits ?? 0),
      hint: "BNB Deposits Credited",
      tone: "from-emerald-400 to-emerald-500",
      badge: "DEPOSITS",
    },
    {
      label: "Withdrawable Earnings Pool",
      value: formatMoney(stats?.totalEarnings ?? 0),
      hint: "Total User Wallet Balances",
      tone: "from-cyan-400 to-blue-500",
      badge: "EARNINGS",
    },
    {
      label: "Pending BNB Deposits",
      value: stats?.pendingDeposits ?? 0,
      hint: formatMoney(stats?.pendingDepositVolume ?? 0) + " volume awaiting credit",
      tone: "from-orange-400 to-amber-500",
      badge: "ACTION REQ",
    },
    {
      label: "Pending Withdrawals",
      value: stats?.pendingWithdrawals ?? 0,
      hint: formatMoney(stats?.pendingWithdrawVolume ?? 0) + " payout requests",
      tone: "from-rose-400 to-red-500",
      badge: "PAYOUT REQ",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Overview Dashboard"
        description="Real-time control center for user balances, BNB deposits, and payout queues."
        actions={
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-amber-400 shadow-sm transition hover:bg-slate-700 hover:text-amber-300 disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "⚡ Refresh Data"}
          </button>
        }
      />

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          {error}
        </div>
      ) : null}

      {/* Quick Action Navigation Bar */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => navigate("/deposits?status=pending")}
          className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-amber-500/5 p-4 text-left shadow-sm transition hover:border-amber-400/60 hover:from-amber-500/20"
        >
          <div>
            <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Deposits Queue</p>
            <p className="text-sm font-semibold text-white mt-0.5">Approve BNB Deposits</p>
          </div>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/20 text-amber-400 font-bold">
            →
          </span>
        </button>

        <button
          type="button"
          onClick={() => navigate("/withdrawals?status=pending")}
          className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-gradient-to-r from-rose-500/10 to-rose-500/5 p-4 text-left shadow-sm transition hover:border-rose-400/60 hover:from-rose-500/20"
        >
          <div>
            <p className="text-xs font-bold text-rose-400 uppercase tracking-wider">Payout Queue</p>
            <p className="text-sm font-semibold text-white mt-0.5">Process Withdrawals</p>
          </div>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-400/20 text-rose-400 font-bold">
            →
          </span>
        </button>

        <button
          type="button"
          onClick={() => navigate("/signals")}
          className="flex items-center justify-between rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-cyan-500/5 p-4 text-left shadow-sm transition hover:border-cyan-400/60 hover:from-cyan-500/20"
        >
          <div>
            <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Trading Signals</p>
            <p className="text-sm font-semibold text-white mt-0.5">Publish New Signal</p>
          </div>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/20 text-cyan-400 font-bold">
            +
          </span>
        </button>

        <button
          type="button"
          onClick={() => navigate("/users")}
          className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 p-4 text-left shadow-sm transition hover:border-emerald-400/60 hover:from-emerald-500/20"
        >
          <div>
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">User Directory</p>
            <p className="text-sm font-semibold text-white mt-0.5">Manage Users & Balances</p>
          </div>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/20 text-emerald-400 font-bold">
            👥
          </span>
        </button>
      </div>

      {loading && !stats ? (
        <div className="py-12 text-center text-sm font-medium text-slate-400">
          Loading metrics...
        </div>
      ) : (
        <>
          {/* KPI Analytics Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {cards.map((card) => (
              <div
                key={card.label}
                className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-lg relative"
              >
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.tone}`} />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                    {card.badge}
                  </span>
                </div>
                <p className="mt-3 text-2xl font-black tracking-tight text-white">
                  {card.value}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-400">{card.label}</p>
                <p className="mt-2 text-[11px] text-slate-400">{card.hint}</p>
              </div>
            ))}
          </div>

          {/* Activity Tables Grid */}
          <div className="grid gap-6 xl:grid-cols-2">
            {/* Pending Deposits Section */}
            <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 bg-slate-900/50">
                <div>
                  <h2 className="font-bold text-white text-base">
                    Pending BNB Deposits
                  </h2>
                  <p className="text-xs text-slate-400">
                    Verify & credit USDT principal to user accounts
                  </p>
                </div>
                <Link
                  to="/deposits?status=pending"
                  className="rounded-lg bg-amber-400/10 border border-amber-400/30 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-400/20"
                >
                  Manage All →
                </Link>
              </div>
              <div className="divide-y divide-slate-800/60">
                {pendingDeposits.length === 0 ? (
                  <p className="px-5 py-10 text-center text-xs font-medium text-slate-400">
                    ✨ No pending deposits requiring approval
                  </p>
                ) : (
                  pendingDeposits.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-900/30 transition"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">
                          {d.user?.name || "User"}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {d.user?.email}
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-amber-400/90">
                          Tx: {shortHash(d.txHash)} · {formatDate(d.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-emerald-400">
                          +{formatMoney(d.amountUsdt)}
                        </p>
                        <div className="mt-1.5 flex justify-end">
                          <StatusBadge status={d.status} />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Pending Withdrawals Section */}
            <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 bg-slate-900/50">
                <div>
                  <h2 className="font-bold text-white text-base">
                    Pending Earnings Withdrawals
                  </h2>
                  <p className="text-xs text-slate-400">
                    Process user payouts from withdrawable earnings
                  </p>
                </div>
                <Link
                  to="/withdrawals?status=pending"
                  className="rounded-lg bg-rose-400/10 border border-rose-400/30 px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-400/20"
                >
                  Manage All →
                </Link>
              </div>
              <div className="divide-y divide-slate-800/60">
                {pendingWithdrawals.length === 0 ? (
                  <p className="px-5 py-10 text-center text-xs font-medium text-slate-400">
                    ✨ No pending withdrawal requests
                  </p>
                ) : (
                  pendingWithdrawals.map((w) => (
                    <div
                      key={w.id}
                      className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-900/30 transition"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">
                          {w.user?.name || "User"}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {w.user?.email}
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-slate-400">
                          Payout: {shortHash(w.payoutAddress, 8, 6)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-rose-400">
                          -{formatMoney(w.amount)}
                        </p>
                        <div className="mt-1.5 flex justify-end">
                          <StatusBadge status={w.status} />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
