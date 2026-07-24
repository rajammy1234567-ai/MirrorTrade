import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingDeposits, setPendingDeposits] = useState<DepositRow[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<WithdrawRow[]>(
    []
  );
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
      label: "Total Users",
      value: stats?.totalUsers ?? 0,
      hint: `${stats?.activeUsers ?? 0} active`,
      tone: "from-blue-500 to-blue-600",
    },
    {
      label: "Level Capital",
      value: formatMoney(stats?.totalLevelCapital ?? stats?.totalDeposits ?? 0),
      hint: "VIP purchases (USD)",
      tone: "from-indigo-500 to-violet-600",
    },
    {
      label: "USDT Deposits",
      value: formatMoney(stats?.totalUsdtBalance ?? 0),
      hint: "Spendable balance held",
      tone: "from-cyan-500 to-teal-600",
    },
    {
      label: "Earnings Pool",
      value: formatMoney(stats?.totalEarnings ?? 0),
      hint: "Withdrawable wallets",
      tone: "from-emerald-500 to-green-600",
    },
    {
      label: "Pending Deposits",
      value: stats?.pendingDeposits ?? 0,
      hint: formatMoney(stats?.pendingDepositVolume ?? 0) + " volume",
      tone: "from-amber-500 to-orange-500",
    },
    {
      label: "Pending Withdrawals",
      value: stats?.pendingWithdrawals ?? 0,
      hint: formatMoney(stats?.pendingWithdrawVolume ?? 0) + " volume",
      tone: "from-rose-500 to-pink-600",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Live overview of users, dual-wallet balances, and ops queues that need action."
        actions={
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        }
      />

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading && !stats ? (
        <p className="text-slate-500">Loading dashboard…</p>
      ) : (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
              <div
                key={card.label}
                className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
              >
                <div className={`h-1 bg-gradient-to-r ${card.tone}`} />
                <div className="p-5">
                  <p className="text-sm font-medium text-slate-500">
                    {card.label}
                  </p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                    {card.value}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{card.hint}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <Link
              to="/deposits?status=pending"
              className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
            >
              Review pending deposits →
            </Link>
            <Link
              to="/withdrawals?status=pending"
              className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900 transition hover:bg-rose-100"
            >
              Process withdrawals →
            </Link>
            <Link
              to="/users"
              className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900 transition hover:bg-blue-100"
            >
              Manage users & capital →
            </Link>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Pending BNB deposits
                  </h2>
                  <p className="text-xs text-slate-500">
                    Approve after on-chain confirmation
                  </p>
                </div>
                <Link
                  to="/deposits"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  View all
                </Link>
              </div>
              <div className="divide-y divide-slate-100">
                {pendingDeposits.length === 0 ? (
                  <p className="px-5 py-10 text-center text-sm text-slate-400">
                    No pending deposits
                  </p>
                ) : (
                  pendingDeposits.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between gap-3 px-5 py-3.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {d.user?.name || "User"} · {d.user?.email}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDate(d.createdAt)} · Tx {shortHash(d.txHash)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">
                          {formatMoney(d.amountUsdt)}
                        </p>
                        <StatusBadge status={d.status} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Pending withdrawals
                  </h2>
                  <p className="text-xs text-slate-500">
                    Pay from earnings only (walletBalance)
                  </p>
                </div>
                <Link
                  to="/withdrawals"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  View all
                </Link>
              </div>
              <div className="divide-y divide-slate-100">
                {pendingWithdrawals.length === 0 ? (
                  <p className="px-5 py-10 text-center text-sm text-slate-400">
                    No pending withdrawals
                  </p>
                ) : (
                  pendingWithdrawals.map((w) => (
                    <div
                      key={w.id}
                      className="flex items-center justify-between gap-3 px-5 py-3.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {w.user?.name || "User"} · {w.user?.email}
                        </p>
                        <p className="truncate font-mono text-xs text-slate-500">
                          {shortHash(w.payoutAddress, 10, 8)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">
                          {formatMoney(w.amount)}
                        </p>
                        <StatusBadge status={w.status} />
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
