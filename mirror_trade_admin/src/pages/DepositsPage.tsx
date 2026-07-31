import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { api, getErrorMessage, type DepositRow } from "../lib/api";
import { formatDate, formatMoney, shortHash } from "../lib/currency";

type StatusFilter = "all" | "pending" | "credited" | "rejected";

export default function DepositsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = (searchParams.get("status") as StatusFilter) || "pending";

  const [rows, setRows] = useState<DepositRow[]>([]);
  const [status, setStatus] = useState<StatusFilter>(
    ["all", "pending", "credited", "rejected"].includes(initial)
      ? initial
      : "pending"
  );
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [actionRow, setActionRow] = useState<DepositRow | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = status === "all" ? undefined : { status };
      const res = await api.get("/admin/deposits", { params });
      setRows(res.data.data || []);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load deposits"));
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
  }, [status]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.user?.name?.toLowerCase().includes(q) ||
        r.user?.email?.toLowerCase().includes(q) ||
        r.txHash?.toLowerCase().includes(q) ||
        r.id?.toLowerCase().includes(q)
    );
  }, [rows, query]);

  const openAction = (row: DepositRow, type: "approve" | "reject") => {
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

  const confirmAction = async () => {
    if (!actionRow || !actionType) return;
    setBusyId(actionRow.id);
    setError("");
    setSuccess("");
    try {
      if (actionType === "approve") {
        const res = await api.post(`/admin/deposits/${actionRow.id}/approve`, { note });
        const autoLevel = res.data?.data?.autoPurchasedLevel?.rank;
        setSuccess(
          `Deposit ${formatMoney(actionRow.amountUsdt)} credited to ${actionRow.user?.name || "user"}${
            autoLevel ? ` · Auto-activated level ${autoLevel}! 🎉` : ""
          }`
        );
      } else {
        await api.post(`/admin/deposits/${actionRow.id}/reject`, { note });
        setSuccess(`Deposit rejected for ${actionRow.user?.name || "user"}`);
      }
      closeAction();
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Action failed"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="BNB Deposits Control"
        description="Review on-chain BNB deposits submitted by users and credit USDT principal balance."
        actions={
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-amber-400 shadow-sm transition hover:bg-slate-700 hover:text-amber-300 disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "⚡ Refresh Queue"}
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

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-xl lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5 rounded-xl bg-slate-900 p-1 border border-slate-800">
          {(
            [
              ["pending", "Pending Queue"],
              ["credited", "Credited"],
              ["rejected", "Rejected"],
              ["all", "All Records"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value)}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                status === value
                  ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍 Search user, email, address, or TxHash..."
          className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/50 lg:max-w-md"
        />
      </div>

      {/* Deposits Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-xl">
        {loading ? (
          <p className="px-5 py-12 text-center text-sm font-medium text-slate-400">
            Loading deposits queue...
          </p>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No deposit requests found"
            description="When users submit BNB deposits from the app, they appear here for 1-click verification."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-900 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-4">User Details</th>
                  <th className="px-5 py-4">USDT Amount</th>
                  <th className="px-5 py-4">Network & TxHash</th>
                  <th className="px-5 py-4">Submitted Date</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((d) => (
                  <tr
                    key={d.id}
                    className="hover:bg-slate-900/40 transition"
                  >
                    <td className="px-5 py-4">
                      <p className="font-bold text-white">
                        {d.user?.name || "—"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {d.user?.email || "—"}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-black text-amber-400 text-base">
                        {formatMoney(d.amountUsdt)} USDT
                      </p>
                      {d.amountBnb != null ? (
                        <p className="text-xs font-medium text-slate-400">
                          ~{d.amountBnb} {d.coin || "BNB"}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs font-semibold text-slate-300">
                        {d.network || "BSC (BEP-20)"}
                      </p>
                      {d.txHash ? (
                        <a
                          href={`https://bscscan.com/tx/${d.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-0.5 inline-block font-mono text-xs text-amber-400 underline hover:text-amber-300"
                        >
                          Tx: {shortHash(d.txHash)} ↗
                        </a>
                      ) : (
                        <span className="text-xs text-slate-500">No TxHash</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-slate-400">
                      {formatDate(d.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      {d.status === "pending" ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openAction(d, "approve")}
                            className="rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/30"
                          >
                            ✓ Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => openAction(d, "reject")}
                            className="rounded-lg bg-rose-500/20 border border-rose-500/40 px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/30"
                          >
                            ✕ Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 font-medium">Processed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {actionRow && actionType ? (
        <Modal
          title={actionType === "approve" ? "Approve & Credit Deposit" : "Reject Deposit Request"}
          onClose={closeAction}
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              {actionType === "approve"
                ? `Confirm crediting ${formatMoney(actionRow.amountUsdt)} USDT to ${actionRow.user?.name || "user"} (${actionRow.user?.email}).`
                : `Reject deposit request for ${actionRow.user?.name || "user"}.`}
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Note / Transaction Memo
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note or reference number..."
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={closeAction}
                disabled={Boolean(busyId)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAction}
                disabled={Boolean(busyId)}
                className={`rounded-xl px-5 py-2 text-xs font-bold text-slate-950 shadow-md ${
                  actionType === "approve"
                    ? "bg-emerald-400 hover:bg-emerald-300"
                    : "bg-rose-500 text-white hover:bg-rose-400"
                }`}
              >
                {busyId ? "Processing..." : actionType === "approve" ? "Confirm Approval" : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
