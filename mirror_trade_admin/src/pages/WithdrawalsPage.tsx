import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { api, getErrorMessage, type WithdrawRow } from "../lib/api";
import { formatDate, formatMoney, shortHash } from "../lib/currency";

type StatusFilter = "all" | "pending" | "paid" | "rejected";

export default function WithdrawalsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = (searchParams.get("status") as StatusFilter) || "pending";

  const [rows, setRows] = useState<WithdrawRow[]>([]);
  const [status, setStatus] = useState<StatusFilter>(
    ["all", "pending", "paid", "rejected"].includes(initial)
      ? initial
      : "pending"
  );
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [actionRow, setActionRow] = useState<WithdrawRow | null>(null);
  const [actionType, setActionType] = useState<"pay" | "reject" | null>(null);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = status === "all" ? undefined : { status };
      const res = await api.get("/admin/withdrawals", { params });
      setRows(res.data.data || []);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load withdrawals"));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (status === "all") {
      searchParams.delete("status");
      setSearchParams(searchParams, { replace: true });
    } else {
      setSearchParams({ status }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.user?.name?.toLowerCase().includes(q) ||
        r.user?.email?.toLowerCase().includes(q) ||
        r.payoutAddress?.toLowerCase().includes(q) ||
        r.id?.toLowerCase().includes(q)
    );
  }, [rows, query]);

  const openAction = (row: WithdrawRow, type: "pay" | "reject") => {
    setActionRow(row);
    setActionType(type);
    setNote("");
    setError("");
  };

  const closeAction = () => {
    if (busyId) return;
    setActionRow(null);
    setActionType(null);
    setNote("");
  };

  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setSuccess("Payout address copied");
      setTimeout(() => setSuccess(""), 2000);
    } catch {
      setError("Could not copy address");
    }
  };

  const confirmAction = async () => {
    if (!actionRow || !actionType) return;
    setBusyId(actionRow.id);
    setError("");
    setSuccess("");
    try {
      if (actionType === "pay") {
        await api.post(`/admin/withdrawals/${actionRow.id}/pay`, { note });
        setSuccess(
          `Marked paid: ${formatMoney(actionRow.amount)} to ${actionRow.user?.name || "user"}`
        );
      } else {
        await api.post(`/admin/withdrawals/${actionRow.id}/reject`, { note });
        setSuccess(
          `Rejected — earnings refunded for ${actionRow.user?.name || "user"}`
        );
      }
      setActionRow(null);
      setActionType(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Action failed"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Withdrawals"
        description="Payouts from earnings only (walletBalance). Deposit principal (USDT) is never withdrawable."
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
        <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
          {(
            [
              ["pending", "Pending"],
              ["paid", "Paid"],
              ["rejected", "Rejected"],
              ["all", "All"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                status === value
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search user, email, or address…"
          className="w-full flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none ring-blue-500 focus:bg-white focus:ring-2 lg:max-w-sm"
        />
        <p className="text-sm text-slate-500 lg:ml-auto">
          Showing {filtered.length}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="px-5 py-12 text-center text-slate-500">
            Loading withdrawals…
          </p>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No withdrawal requests"
            description="User payout requests from app earnings will show up here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Payout address</th>
                  <th className="px-4 py-3 font-semibold">Requested</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((w) => (
                  <tr
                    key={w.id}
                    className="border-t border-slate-100 hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">
                        {w.user?.name || "—"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {w.user?.email || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">
                        {formatMoney(w.amount)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {w.currency || "USDT"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-slate-600">
                        {w.network || "BSC (BEP-20)"}
                      </p>
                      <button
                        type="button"
                        onClick={() => copyAddress(w.payoutAddress)}
                        className="font-mono text-xs text-blue-600 hover:underline"
                        title={w.payoutAddress}
                      >
                        {shortHash(w.payoutAddress, 12, 10)}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(w.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={w.status} />
                      {w.note ? (
                        <p className="mt-1 max-w-[160px] truncate text-[11px] text-slate-400">
                          {w.note}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {w.status === "pending" ? (
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => openAction(w, "pay")}
                            className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                          >
                            Mark paid
                          </button>
                          <button
                            type="button"
                            onClick={() => openAction(w, "reject")}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {w.processedAt
                            ? formatDate(w.processedAt)
                            : "—"}
                        </span>
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
        open={!!actionRow && !!actionType}
        onClose={closeAction}
        title={
          actionType === "pay" ? "Mark withdrawal paid" : "Reject withdrawal"
        }
        subtitle={
          actionRow
            ? `${actionRow.user?.name || "User"} · ${formatMoney(actionRow.amount)}`
            : undefined
        }
      >
        {actionRow ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              <p className="text-slate-400">Send to</p>
              <p className="mt-1 break-all font-mono text-xs text-slate-800">
                {actionRow.payoutAddress}
              </p>
              <button
                type="button"
                onClick={() => copyAddress(actionRow.payoutAddress)}
                className="mt-2 text-xs font-semibold text-blue-600"
              >
                Copy address
              </button>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Note (optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                placeholder={
                  actionType === "pay"
                    ? "e.g. Paid via BSC · tx hash …"
                    : "e.g. Invalid address"
                }
              />
            </div>
            <p className="text-xs text-slate-500">
              {actionType === "pay"
                ? "Only mark paid after you have actually sent funds on-chain."
                : "Rejecting refunds the amount back to the user's earnings wallet."}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeAction}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!!busyId}
                onClick={confirmAction}
                className={`rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
                  actionType === "pay"
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-rose-600 hover:bg-rose-500"
                }`}
              >
                {busyId
                  ? "Processing…"
                  : actionType === "pay"
                    ? "Confirm paid"
                    : "Confirm reject"}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
