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
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(
    null
  );
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params =
        status === "all" ? undefined : { status };
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setActionRow(null);
      setActionType(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Action failed"));
    } finally {
      setBusyId(null);
    }
  };

  const counts = useMemo(() => {
    return {
      all: rows.length,
      pending: rows.filter((r) => r.status === "pending").length,
    };
  }, [rows]);

  return (
    <div>
      <PageHeader
        title="Deposits"
        description="BNB (BSC) deposits submitted by users. Confirm on-chain, then credit USDT spendable balance."
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
              ["credited", "Credited"],
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
          placeholder="Search user, email, or tx hash…"
          className="w-full flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none ring-blue-500 focus:bg-white focus:ring-2 lg:max-w-sm"
        />
        <p className="text-sm text-slate-500 lg:ml-auto">
          Showing {filtered.length}
          {status === "pending" ? ` · queue focus` : ""}
          {status !== "all" && counts.pending > 0 && status !== "pending"
            ? ""
            : ""}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="px-5 py-12 text-center text-slate-500">
            Loading deposits…
          </p>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No deposit requests"
            description="When users submit BNB payments from the app, they appear here for review."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Network / Tx</th>
                  <th className="px-4 py-3 font-semibold">Submitted</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr
                    key={d.id}
                    className="border-t border-slate-100 hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">
                        {d.user?.name || "—"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {d.user?.email || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">
                        {formatMoney(d.amountUsdt)} USDT
                      </p>
                      {d.amountBnb != null ? (
                        <p className="text-xs text-slate-500">
                          ~{d.amountBnb} {d.coin || "BNB"}
                        </p>
                      ) : null}
                      {d.targetRank ? (
                        <span className="mt-1 inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                          Target: {d.targetRank}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-slate-600">
                        {d.network || "BSC (BEP-20)"}
                      </p>
                      {d.txHash ? (
                        <a
                          href={`https://bscscan.com/tx/${d.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-xs text-blue-600 hover:underline"
                          title="View on BSCScan"
                        >
                          {shortHash(d.txHash)} ↗
                        </a>
                      ) : (
                        <p className="font-mono text-xs text-slate-400">No tx hash</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(d.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={d.status} />
                      {d.note ? (
                        <p className="mt-1 max-w-[160px] truncate text-[11px] text-slate-400">
                          {d.note}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {d.status === "pending" ? (
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => openAction(d, "approve")}
                            className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => openAction(d, "reject")}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {d.creditedAt
                            ? `Done ${formatDate(d.creditedAt)}`
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
          actionType === "approve" ? "Approve deposit" : "Reject deposit"
        }
        subtitle={
          actionRow
            ? `${actionRow.user?.name || "User"} · ${formatMoney(actionRow.amountUsdt)} USDT`
            : undefined
        }
      >
        {actionRow ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              <p>
                <span className="text-slate-400">Tx: </span>
                <span className="break-all font-mono text-xs">
                  {actionRow.txHash || "Not provided"}
                </span>
              </p>
              <p className="mt-1">
                <span className="text-slate-400">Network: </span>
                {actionRow.network || "BSC"}
              </p>
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
                  actionType === "approve"
                    ? "e.g. Confirmed on BSCScan"
                    : "e.g. Invalid tx / wrong amount"
                }
              />
            </div>
            <p className="text-xs text-slate-500">
              {actionType === "approve"
                ? "This credits the user's USDT deposit balance (spendable for VIP levels only)."
                : "User will not receive USDT credit for this request."}
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
                  actionType === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-rose-600 hover:bg-rose-500"
                }`}
              >
                {busyId
                  ? "Processing…"
                  : actionType === "approve"
                    ? "Confirm credit"
                    : "Confirm reject"}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
