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
  const [payoutTxHash, setPayoutTxHash] = useState("");

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
    setPayoutTxHash("");
    setError("");
  };

  const closeAction = () => {
    if (busyId) return;
    setActionRow(null);
    setActionType(null);
    setNote("");
    setPayoutTxHash("");
  };

  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setSuccess("Payout address copied!");
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
        await api.post(`/admin/withdrawals/${actionRow.id}/pay`, {
          note,
          txHash: payoutTxHash.trim() || undefined,
        });
        setSuccess(
          `Payout of ${formatMoney(actionRow.amount)} marked as PAID to ${actionRow.user?.name || "user"}`
        );
      } else {
        await api.post(`/admin/withdrawals/${actionRow.id}/reject`, { note });
        setSuccess(
          `Withdrawal rejected — earnings refunded to ${actionRow.user?.name || "user"}'s wallet balance.`
        );
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
        title="Earnings Withdrawals Control"
        description="Process payout requests from user withdrawable earnings (profit share & referral rewards)."
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
              ["pending", "Pending Payouts"],
              ["paid", "Paid"],
              ["rejected", "Rejected & Refunded"],
              ["all", "All Records"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value)}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                status === value
                  ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
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
          placeholder="🔍 Search user, payout address, or TxHash..."
          className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 lg:max-w-md"
        />
      </div>

      {/* Withdrawals Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-xl">
        {loading ? (
          <p className="px-5 py-12 text-center text-sm font-medium text-slate-400">
            Loading payout requests queue...
          </p>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No withdrawal requests found"
            description="When users request earnings payouts, they appear here for 1-click execution."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-900 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-4">User Details</th>
                  <th className="px-5 py-4">Payout Amount</th>
                  <th className="px-5 py-4">Payout Address & Network</th>
                  <th className="px-5 py-4">Requested Date</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-900/40 transition">
                    <td className="px-5 py-4">
                      <p className="font-bold text-white">
                        {w.user?.name || "—"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {w.user?.email || "—"}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-black text-rose-400 text-base">
                        {formatMoney(w.amount)} USDT
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-white">
                          {shortHash(w.payoutAddress, 10, 8)}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyAddress(w.payoutAddress)}
                          className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300 hover:bg-slate-700"
                        >
                          Copy 📋
                        </button>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-400 font-medium">
                        Network: {w.network || "BSC (BEP-20)"}
                      </p>
                      {w.txHash ? (
                        <span className="font-mono text-[11px] text-emerald-400">
                          Payout Tx: {shortHash(w.txHash)}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-slate-400">
                      {formatDate(w.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={w.status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      {w.status === "pending" ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openAction(w, "pay")}
                            className="rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/30"
                          >
                            💸 Mark Paid
                          </button>
                          <button
                            type="button"
                            onClick={() => openAction(w, "reject")}
                            className="rounded-lg bg-rose-500/20 border border-rose-500/40 px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/30"
                          >
                            ✕ Reject & Refund
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
          title={actionType === "pay" ? "Confirm Payout Execution" : "Reject & Refund Withdrawal"}
          onClose={closeAction}
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              {actionType === "pay"
                ? `Confirm payout of ${formatMoney(actionRow.amount)} USDT to ${actionRow.user?.name || "user"} (${actionRow.payoutAddress}).`
                : `Reject withdrawal request. This will automatically refund ${formatMoney(actionRow.amount)} USDT back to ${actionRow.user?.name || "user"}'s withdrawable wallet balance.`}
            </p>

            {actionType === "pay" ? (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Blockchain Payout TxHash (Optional)
                </label>
                <input
                  type="text"
                  value={payoutTxHash}
                  onChange={(e) => setPayoutTxHash(e.target.value)}
                  placeholder="Paste transaction hash (0x...)..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none focus:border-rose-500 font-mono"
                />
              </div>
            ) : null}

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Note / Memo
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note for records..."
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none focus:border-rose-500"
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
                className={`rounded-xl px-5 py-2 text-xs font-bold shadow-md ${
                  actionType === "pay"
                    ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                    : "bg-rose-500 text-white hover:bg-rose-400"
                }`}
              >
                {busyId ? "Processing..." : actionType === "pay" ? "Confirm Paid" : "Confirm Reject & Refund"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
