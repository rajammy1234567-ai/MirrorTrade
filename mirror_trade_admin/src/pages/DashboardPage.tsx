import { useEffect, useState } from "react";
import { api, type AuthUser, type DashboardStats } from "../lib/api";
import { formatMoney } from "../lib/currency";
import { useAuth } from "../context/AuthContext";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [statsRes, usersRes] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/users"),
      ]);
      setStats(statsRes.data.data);
      setUsers(usersRes.data.data || []);
    } catch (err: unknown) {
      const message =
        // @ts-expect-error axios error shape
        err?.response?.data?.message ||
        (err instanceof Error ? err.message : "Failed to load dashboard");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleStatus = async (id: string, isActive: boolean) => {
    try {
      await api.patch(`/admin/users/${id}/status`, { isActive: !isActive });
      await load();
    } catch (err: unknown) {
      const message =
        // @ts-expect-error axios error shape
        err?.response?.data?.message || "Failed to update user";
      setError(message);
    }
  };

  const creditDeposit = async (id: string, name: string) => {
    const raw = window.prompt(
      `Set exchange capital (for VIP levels) for ${name}:`,
      "100"
    );
    if (raw == null) return;
    const amount = Number(raw);
    if (!amount || amount <= 0) {
      setError("Enter a valid deposit amount");
      return;
    }
    try {
      const res = await api.post(`/admin/users/${id}/deposit`, { amount });
      const ranks = res.data?.ranks;
      if (ranks) {
        window.alert(
          `Deposit ${formatMoney(amount)} credited.\nT-VIP: ${ranks.tVip}\nC-VIP: ${ranks.cVip}`
        );
      }
      await load();
    } catch (err: unknown) {
      const message =
        // @ts-expect-error axios error shape
        err?.response?.data?.message || "Failed to credit deposit";
      setError(message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
              MirrorTrade Admin
            </p>
            <h1 className="text-lg font-bold text-slate-900">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:inline">
              {user?.email}
            </span>
            <button
              onClick={logout}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <p className="text-slate-500">Loading...</p>
        ) : (
          <>
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {[
                { label: "Total Users", value: stats?.totalUsers ?? 0 },
                { label: "Active Users", value: stats?.activeUsers ?? 0 },
                { label: "Inactive Users", value: stats?.inactiveUsers ?? 0 },
                { label: "Admins", value: stats?.admins ?? 0 },
                {
                  label: "Total Deposits (INR)",
                  value: formatMoney(stats?.totalDeposits ?? 0),
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p className="text-sm text-slate-500">{card.label}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {card.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="font-semibold text-slate-900">Users</h2>
                <p className="text-sm text-slate-500">
                  T-VIP / C-VIP from exchange capital · admin can set capital if API sync fails
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-medium">Name</th>
                      <th className="px-5 py-3 font-medium">Email</th>
                      <th className="px-5 py-3 font-medium">Deposit</th>
                      <th className="px-5 py-3 font-medium">Wallet</th>
                      <th className="px-5 py-3 font-medium">T-VIP</th>
                      <th className="px-5 py-3 font-medium">C-VIP</th>
                      <th className="px-5 py-3 font-medium">Referral</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-t border-slate-100">
                        <td className="px-5 py-3 font-medium text-slate-900">
                          {u.name}
                        </td>
                        <td className="px-5 py-3 text-slate-600">{u.email}</td>
                        <td className="px-5 py-3 text-slate-600">
                          {formatMoney(u.totalDeposit || 0)}
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {formatMoney(u.walletBalance || 0, 2)}
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                            {u.tVipRank || "NONE"}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                            {u.cVipRank || "NONE"}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-slate-500">
                          {u.referralCode || "—"}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              u.isActive
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {u.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {u.role === "user" ? (
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => creditDeposit(u.id, u.name)}
                                className="rounded-lg border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                              >
                                Set capital
                              </button>
                              <button
                                onClick={() => toggleStatus(u.id, u.isActive)}
                                className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              >
                                {u.isActive ? "Deactivate" : "Activate"}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
