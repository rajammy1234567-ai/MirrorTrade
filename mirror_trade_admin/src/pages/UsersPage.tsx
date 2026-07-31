import { useCallback, useEffect, useMemo, useState } from "react";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { api, getErrorMessage, type AuthUser } from "../lib/api";
import { formatMoney } from "../lib/currency";

type CapitalKind = "vip" | "usdt";
type CapitalMode = "set" | "add";

export default function UsersPage() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "user" | "admin">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [modalUser, setModalUser] = useState<AuthUser | null>(null);
  const [kind, setKind] = useState<CapitalKind>("vip");
  const [mode, setMode] = useState<CapitalMode>("set");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/users", {
        params: { page: 1, limit: 200 },
      });
      setUsers(res.data.data || []);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load users"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter === "active" && !u.isActive) return false;
      if (statusFilter === "inactive" && u.isActive) return false;
      if (!q) return true;
      return (
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.referralCode?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q)
      );
    });
  }, [users, query, roleFilter, statusFilter]);

  const openCapitalModal = (user: AuthUser) => {
    setModalUser(user);
    setKind("vip");
    setMode("set");
    setAmount(String(user.totalDeposit ?? 0));
    setSuccess("");
    setError("");
  };

  const closeModal = () => {
    if (saving) return;
    setModalUser(null);
    setAmount("");
  };

  const submitCapital = async () => {
    if (!modalUser) return;
    const value = Number(amount);
    if (Number.isNaN(value) || value < 0) {
      setError("Enter a valid non-negative amount");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await api.post(`/admin/users/${modalUser.id}/deposit`, {
        amount: value,
        mode,
        kind,
      });
      const ranks = res.data?.ranks;
      const msg =
        kind === "usdt"
          ? `USDT balance updated for ${modalUser.name}`
          : `VIP capital updated for ${modalUser.name}${
              ranks ? ` · T-VIP: ${ranks.tVip} · C-VIP: ${ranks.cVip}` : ""
            }`;
      setSuccess(msg);
      setModalUser(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update balance"));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (user: AuthUser) => {
    if (user.role === "admin") return;
    setBusyId(user.id);
    setError("");
    try {
      await api.patch(`/admin/users/${user.id}/status`, {
        isActive: !user.isActive,
      });
      setSuccess(`${user.name} is now ${user.isActive ? "inactive" : "active"}`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update status"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Accounts Directory"
        description="Manage user balances, VIP rank capital, referral codes, and access permissions."
        actions={
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-amber-400 shadow-sm transition hover:bg-slate-700 hover:text-amber-300 disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "⚡ Refresh Directory"}
          </button>
        }
      />

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          {success}
        </div>
      ) : null}

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-xl lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800">
            {(["all", "user", "admin"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition ${
                  roleFilter === r
                    ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {r}s
              </button>
            ))}
          </div>

          <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800">
            {(["all", "active", "inactive"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition ${
                  statusFilter === s
                    ? "bg-slate-700 text-white shadow-sm"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍 Search name, email, referral code, or phone..."
          className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/50 lg:max-w-md"
        />
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-xl">
        {loading ? (
          <p className="px-5 py-12 text-center text-sm font-medium text-slate-400">
            Loading users directory...
          </p>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No users found"
            description="Adjust your search or filter parameters to view matching accounts."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-900 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-4">User Info</th>
                  <th className="px-5 py-4">USDT Deposit Principal</th>
                  <th className="px-5 py-4">Withdrawable Earnings</th>
                  <th className="px-5 py-4">VIP Level Ranks</th>
                  <th className="px-5 py-4">Referral Code</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-900/40 transition">
                    <td className="px-5 py-4">
                      <p className="font-bold text-white flex items-center gap-2">
                        {u.name}
                        {u.role === "admin" ? (
                          <span className="rounded bg-amber-400/10 border border-amber-400/30 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-400">
                            ADMIN
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-black text-amber-400">
                        {formatMoney(u.totalDeposit ?? u.usdtBalance ?? 0)} USDT
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-black text-emerald-400">
                        {formatMoney(u.walletBalance ?? 0)} USDT
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded bg-indigo-500/20 border border-indigo-500/40 px-2 py-0.5 text-xs font-bold text-indigo-400">
                          {u.tVipRank || "NONE"}
                        </span>
                        <span className="rounded bg-cyan-500/20 border border-cyan-500/40 px-2 py-0.5 text-xs font-bold text-cyan-400">
                          {u.cVipRank || "NONE"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-300">
                      {u.referralCode || "—"}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={u.isActive ? "active" : "inactive"} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openCapitalModal(u)}
                          className="rounded-lg bg-amber-400/10 border border-amber-400/30 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-400/20"
                        >
                          ✏️ Edit Balance
                        </button>
                        {u.role !== "admin" ? (
                          <button
                            type="button"
                            onClick={() => toggleStatus(u)}
                            disabled={busyId === u.id}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                              u.isActive
                                ? "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
                                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                            }`}
                          >
                            {busyId === u.id
                              ? "..."
                              : u.isActive
                                ? "Deactivate"
                                : "Activate"}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Capital / Balance Adjust Modal */}
      {modalUser ? (
        <Modal
          title={`Adjust Balance · ${modalUser.name}`}
          onClose={closeModal}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Balance Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setKind("vip");
                    setAmount(String(modalUser.totalDeposit ?? 0));
                  }}
                  className={`rounded-xl border p-3 text-xs font-bold transition ${
                    kind === "vip"
                      ? "border-amber-400 bg-amber-400/10 text-amber-400"
                      : "border-slate-800 bg-slate-900 text-slate-400"
                  }`}
                >
                  USDT Deposit Principal (VIP Capital)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setKind("usdt");
                    setAmount(String(modalUser.walletBalance ?? 0));
                  }}
                  className={`rounded-xl border p-3 text-xs font-bold transition ${
                    kind === "usdt"
                      ? "border-emerald-400 bg-emerald-400/10 text-emerald-400"
                      : "border-slate-800 bg-slate-900 text-slate-400"
                  }`}
                >
                  Withdrawable Wallet Earnings
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Operation Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode("set")}
                  className={`rounded-xl border p-2.5 text-xs font-bold transition ${
                    mode === "set"
                      ? "border-slate-600 bg-slate-800 text-white"
                      : "border-slate-800 bg-slate-900 text-slate-400"
                  }`}
                >
                  Set Absolute Amount
                </button>
                <button
                  type="button"
                  onClick={() => setMode("add")}
                  className={`rounded-xl border p-2.5 text-xs font-bold transition ${
                    mode === "add"
                      ? "border-slate-600 bg-slate-800 text-white"
                      : "border-slate-800 bg-slate-900 text-slate-400"
                  }`}
                >
                  Add / Credit Amount
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Amount (USDT)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount..."
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white font-mono outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitCapital}
                disabled={saving}
                className="rounded-xl bg-amber-400 px-5 py-2 text-xs font-bold text-slate-950 shadow-md hover:bg-amber-300"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
