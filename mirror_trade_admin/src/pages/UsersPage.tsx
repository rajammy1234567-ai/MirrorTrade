import { useCallback, useEffect, useMemo, useState } from "react";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { api, getErrorMessage, type AuthUser } from "../lib/api";
import { formatDate, formatMoney } from "../lib/currency";

type CapitalKind = "vip" | "usdt";
type CapitalMode = "set" | "add";

export default function UsersPage() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "user" | "admin">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
    "all"
  );

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
      const res = await api.get("/admin/users");
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
      setSuccess(
        `${user.name} is now ${user.isActive ? "inactive" : "active"}`
      );
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update status"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage accounts, dual wallet balances (USDT deposit + earnings), VIP capital, and access status."
        actions={
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        }
      />

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
            />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, phone, referral code…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none ring-blue-500 focus:bg-white focus:ring-2"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) =>
            setRoleFilter(e.target.value as "all" | "user" | "admin")
          }
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
        >
          <option value="all">All roles</option>
          <option value="user">Users</option>
          <option value="admin">Admins</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "all" | "active" | "inactive")
          }
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
        >
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <p className="text-sm text-slate-500 lg:ml-auto">
          {filtered.length} of {users.length}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="px-5 py-12 text-center text-slate-500">Loading users…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No users found"
            description="Try a different search or filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Level capital</th>
                  <th className="px-4 py-3 font-semibold">USDT</th>
                  <th className="px-4 py-3 font-semibold">Earnings</th>
                  <th className="px-4 py-3 font-semibold">Exchange</th>
                  <th className="px-4 py-3 font-semibold">Ranks</th>
                  <th className="px-4 py-3 font-semibold">Referral</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr
                    key={u.id}
                    className="border-t border-slate-100 hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{u.name}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        Joined {formatDate(u.createdAt)}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {formatMoney(u.totalDeposit || 0)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatMoney(u.usdtBalance || 0)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatMoney(u.walletBalance || 0)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <p>{formatMoney(u.exchangeCapital || 0)}</p>
                      <p className="text-[11px] uppercase text-slate-400">
                        {u.primaryExchange || u.capitalSource || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                          {u.tVipRank || "NONE"}
                        </span>
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                          {u.cVipRank || "NONE"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {u.referralCode || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <StatusBadge
                          status={u.isActive ? "active" : "inactive"}
                        />
                        <StatusBadge status={u.role} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {u.role === "user" ? (
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => openCapitalModal(u)}
                            className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
                          >
                            Adjust
                          </button>
                          <button
                            type="button"
                            disabled={busyId === u.id}
                            onClick={() => toggleStatus(u)}
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                            {u.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Protected</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={!!modalUser}
        onClose={closeModal}
        title="Adjust balances"
        subtitle={
          modalUser
            ? `${modalUser.name} · ${modalUser.email}`
            : undefined
        }
      >
        {modalUser ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              <div>
                <p className="text-slate-400">Level capital</p>
                <p className="font-semibold text-slate-800">
                  {formatMoney(modalUser.totalDeposit || 0)}
                </p>
              </div>
              <div>
                <p className="text-slate-400">USDT balance</p>
                <p className="font-semibold text-slate-800">
                  {formatMoney(modalUser.usdtBalance || 0)}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Earnings</p>
                <p className="font-semibold text-slate-800">
                  {formatMoney(modalUser.walletBalance || 0)}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Ranks</p>
                <p className="font-semibold text-slate-800">
                  {modalUser.tVipRank || "NONE"} / {modalUser.cVipRank || "NONE"}
                </p>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                What to update
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setKind("vip");
                    setAmount(String(modalUser.totalDeposit ?? 0));
                  }}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                    kind === "vip"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  VIP capital
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setKind("usdt");
                    setAmount(String(modalUser.usdtBalance ?? 0));
                  }}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                    kind === "usdt"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  USDT deposit
                </button>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                {kind === "vip"
                  ? "VIP capital drives T-VIP / C-VIP ranks (level purchases)."
                  : "USDT is spendable deposit balance for buying levels — not withdrawable."}
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode("set")}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                    mode === "set"
                      ? "border-slate-800 bg-slate-900 text-white"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  Set absolute
                </button>
                <button
                  type="button"
                  onClick={() => setMode("add")}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                    mode === "add"
                      ? "border-slate-800 bg-slate-900 text-white"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  Add amount
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Amount (USD / USDT)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2"
                placeholder="0.00"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitCapital}
                disabled={saving}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
