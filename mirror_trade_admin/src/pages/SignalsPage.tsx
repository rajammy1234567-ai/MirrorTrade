import { useCallback, useEffect, useState } from "react";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import { api, getErrorMessage } from "../lib/api";

export type SignalRow = {
  id: string;
  provider: string;
  pair: string;
  symbol: string;
  direction: "long" | "short";
  entry: number;
  target: number;
  stopLoss: number;
  time: string;
  publishedAt: string;
};

export default function SignalsPage() {
  const [signals, setSignals] = useState<SignalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [provider, setProvider] = useState("Nova Desk");
  const [pair, setPair] = useState("BTC/USDT");
  const [direction, setDirection] = useState<"long" | "short">("long");
  const [entry, setEntry] = useState("");
  const [target, setTarget] = useState("");
  const [stopLoss, setStopLoss] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/trade/signals");
      setSignals(res.data.data || []);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load signals"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onCreateSignal = async () => {
    if (!entry || !target || !stopLoss) {
      setError("Please fill all signal parameters (entry, target, stop loss)");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await api.post("/admin/signals", {
        provider: provider.trim() || "Admin Desk",
        pair: pair.trim(),
        direction,
        entry: Number(entry),
        target: Number(target),
        stopLoss: Number(stopLoss),
      });
      setSuccess(`Signal ${pair} (${direction.toUpperCase()}) published successfully!`);
      setModalOpen(false);
      setEntry("");
      setTarget("");
      setStopLoss("");
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to publish signal"));
    } finally {
      setSubmitting(false);
    }
  };

  const onDeleteSignal = async (id: string, pairName: string) => {
    if (!window.confirm(`Deactivate signal for ${pairName}?`)) return;
    setError("");
    try {
      await api.delete(`/admin/signals/${id}`);
      setSuccess(`Signal for ${pairName} deactivated`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete signal"));
    }
  };

  return (
    <div>
      <PageHeader
        title="Signals Management"
        description="Publish live trade signals to the client app feed with entry, target, and stop loss."
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              + Publish Signal
            </button>
          </div>
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

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="px-5 py-12 text-center text-slate-500">Loading signals…</p>
        ) : signals.length === 0 ? (
          <EmptyState
            title="No signals published"
            description="Click '+ Publish Signal' to broadcast trade setups to app users."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Provider</th>
                  <th className="px-4 py-3 font-semibold">Pair / Side</th>
                  <th className="px-4 py-3 font-semibold">Entry</th>
                  <th className="px-4 py-3 font-semibold">Target (TP)</th>
                  <th className="px-4 py-3 font-semibold">Stop Loss (SL)</th>
                  <th className="px-4 py-3 font-semibold">Published</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {signals.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-medium text-slate-900">{s.provider}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-900">{s.pair}</span>{" "}
                      <span
                        className={`ml-1 rounded px-1.5 py-0.5 text-xs font-bold ${
                          s.direction === "long"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {s.direction.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">${s.entry}</td>
                    <td className="px-4 py-3 font-mono text-emerald-600">${s.target}</td>
                    <td className="px-4 py-3 font-mono text-rose-600">${s.stopLoss}</td>
                    <td className="px-4 py-3 text-slate-500">{s.time}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => onDeleteSignal(s.id, s.pair)}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        Deactivate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Publish Signal Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Publish New Signal"
        subtitle="Broadcast a new trade call to all MirrorTrade app clients"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Provider Name</label>
            <input
              type="text"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="e.g. Nova Desk"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Pair</label>
              <input
                type="text"
                value={pair}
                onChange={(e) => setPair(e.target.value)}
                placeholder="e.g. BTC/USDT"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Direction</label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as "long" | "short")}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="long">LONG</option>
                <option value="short">SHORT</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Entry Price</label>
              <input
                type="number"
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                placeholder="65000"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Target (TP)</label>
              <input
                type="number"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="68000"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Stop Loss (SL)</label>
              <input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="63500"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={onCreateSignal}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-blue-500"
            >
              {submitting ? "Publishing…" : "Publish Signal"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
