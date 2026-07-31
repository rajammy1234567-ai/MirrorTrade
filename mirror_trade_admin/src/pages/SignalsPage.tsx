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
  const [entry, setEntry] = useState("65000");
  const [target, setTarget] = useState("68500");
  const [stopLoss, setStopLoss] = useState("63500");

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
      setSuccess(`Signal for ${pair} (${direction.toUpperCase()}) broadcasted successfully! 🚀`);
      setModalOpen(false);
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
    <div className="space-y-6">
      <PageHeader
        title="Trading Signals Broadcast"
        description="Publish live crypto trade signals to the MirrorTrade client app feed."
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-amber-400 shadow-sm transition hover:bg-slate-700 hover:text-amber-300 disabled:opacity-60"
            >
              {loading ? "Loading..." : "⚡ Refresh Feed"}
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-md hover:bg-amber-300 transition"
            >
              + Broadcast New Signal
            </button>
          </div>
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

      {/* Signals Grid / Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-xl">
        {loading ? (
          <p className="px-5 py-12 text-center text-sm font-medium text-slate-400">
            Loading signals feed...
          </p>
        ) : signals.length === 0 ? (
          <EmptyState
            title="No signals published"
            description="Click '+ Broadcast New Signal' to broadcast trade setups to client app users."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-900 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-4">Provider / Pair</th>
                  <th className="px-5 py-4">Direction</th>
                  <th className="px-5 py-4">Entry Target</th>
                  <th className="px-5 py-4">Take Profit Target</th>
                  <th className="px-5 py-4">Stop Loss</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {signals.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-900/40 transition">
                    <td className="px-5 py-4">
                      <p className="font-bold text-white text-base">
                        {s.pair}
                      </p>
                      <p className="text-xs text-slate-400">
                        Desk: {s.provider || "Admin Desk"}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-block rounded-md border px-2.5 py-1 text-xs font-extrabold uppercase ${
                          s.direction === "long"
                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                            : "bg-rose-500/20 border-rose-500/40 text-rose-400"
                        }`}
                      >
                        {s.direction}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-white">
                      ${s.entry?.toLocaleString() ?? s.entry}
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-emerald-400">
                      ${s.target?.toLocaleString() ?? s.target}
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-rose-400">
                      ${s.stopLoss?.toLocaleString() ?? s.stopLoss}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteSignal(s.id, s.pair)}
                        className="rounded-lg bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/20"
                      >
                        Deactivate 🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Broadcast Signal Modal */}
      {modalOpen ? (
        <Modal title="Broadcast Trading Signal" onClose={() => setModalOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Signal Desk Provider
              </label>
              <input
                type="text"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="e.g. Nova Desk, Alpha Signals"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none focus:border-amber-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Trading Pair
                </label>
                <input
                  type="text"
                  value={pair}
                  onChange={(e) => setPair(e.target.value)}
                  placeholder="BTC/USDT"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white font-bold outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Direction
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDirection("long")}
                    className={`rounded-xl border p-2.5 text-xs font-bold uppercase transition ${
                      direction === "long"
                        ? "border-emerald-400 bg-emerald-500/20 text-emerald-400"
                        : "border-slate-800 bg-slate-900 text-slate-400"
                    }`}
                  >
                    LONG ↗
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection("short")}
                    className={`rounded-xl border p-2.5 text-xs font-bold uppercase transition ${
                      direction === "short"
                        ? "border-rose-400 bg-rose-500/20 text-rose-400"
                        : "border-slate-800 bg-slate-900 text-slate-400"
                    }`}
                  >
                    SHORT ↘
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Entry Price
                </label>
                <input
                  type="number"
                  value={entry}
                  onChange={(e) => setEntry(e.target.value)}
                  placeholder="65000"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white font-mono outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Take Profit
                </label>
                <input
                  type="number"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="68500"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-emerald-400 font-mono font-bold outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Stop Loss
                </label>
                <input
                  type="number"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  placeholder="63500"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-rose-400 font-mono font-bold outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={submitting}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onCreateSignal}
                disabled={submitting}
                className="rounded-xl bg-amber-400 px-5 py-2 text-xs font-bold text-slate-950 shadow-md hover:bg-amber-300"
              >
                {submitting ? "Broadcasting..." : "Broadcast Signal 🚀"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
