import { useEffect, useState } from "react";
import { api, type AuthUser, type DashboardStats } from "../lib/api";
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
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Total Users", value: stats?.totalUsers ?? 0 },
                { label: "Active Users", value: stats?.activeUsers ?? 0 },
                { label: "Inactive Users", value: stats?.inactiveUsers ?? 0 },
                { label: "Admins", value: stats?.admins ?? 0 },
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
                  Manage mobile app users from the shared API
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-medium">Name</th>
                      <th className="px-5 py-3 font-medium">Email</th>
                      <th className="px-5 py-3 font-medium">Role</th>
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
                        <td className="px-5 py-3 capitalize text-slate-600">
                          {u.role}
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
                            <button
                              onClick={() => toggleStatus(u.id, u.isActive)}
                              className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              {u.isActive ? "Deactivate" : "Activate"}
                            </button>
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
