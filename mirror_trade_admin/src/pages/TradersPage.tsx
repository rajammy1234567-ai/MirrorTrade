import { useCallback, useEffect, useState } from "react";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import { api, getErrorMessage } from "../lib/api";

export type TraderRow = {
  id: string;
  name: string;
  handle: string;
  winRate: number;
  roi30d: number;
  totalRoi: number;
  followers: number;
  copiers: number;
  risk: string;
  bio: string;
};

export default function TradersPage() {
  const [traders, setTraders] = useState<TraderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [winRate, setWinRate] = useState("78");
  const [roi30d, setRoi30d] = useState("42");
  const [risk, setRisk] = useState("Medium");
  const [bio, setBio] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/trade/traders");
      setTraders(res.data.data || []);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load master traders"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onCreateTrader = async () => {
    if (!name.trim()) {
      setError("Please enter trader name");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await api.post("/admin/traders", {
        name: name.trim(),
        handle: handle.trim() || undefined,
        winRate: Number(winRate),
        roi30d: Number(roi30d),
        risk,
        bio: bio.trim() || undefined,
      });
      setSuccess(`Master Trader ${name} profile created! 🎉`);
      setModalOpen(false);
      setName("");
      setHandle("");
      setBio("");
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create trader profile"));
    } finally {
      setSubmitting(false);
    }
  };

  const onDeleteTrader = async (id: string, traderName: string) => {
    if (!window.confirm(`Remove master trader profile for ${traderName}?`)) return;
    setError("");
    try {
      await api.delete(`/admin/traders/${id}`);
      setSuccess(`Trader ${traderName} removed`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to remove trader"));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Traders Management"
        description="Manage top master traders available for users to copy."
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-amber-400 shadow-sm transition hover:bg-slate-700 hover:text-amber-300 disabled:opacity-60"
            >
              {loading ? "Loading..." : "⚡ Refresh List"}
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-md hover:bg-amber-300 transition"
            >
              + Add Master Trader
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

      {/* Master Traders Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-xl">
        {loading ? (
          <p className="px-5 py-12 text-center text-sm font-medium text-slate-400">
            Loading master traders directory...
          </p>
        ) : traders.length === 0 ? (
          <EmptyState
            title="No master traders"
            description="Click '+ Add Master Trader' to add copy-trader profiles."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-900 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-4">Trader Name / Handle</th>
                  <th className="px-5 py-4">Win Rate</th>
                  <th className="px-5 py-4">30D ROI %</th>
                  <th className="px-5 py-4">Copiers</th>
                  <th className="px-5 py-4">Risk Badge</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {traders.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-900/40 transition">
                    <td className="px-5 py-4">
                      <p className="font-bold text-white text-base">
                        {t.name}
                      </p>
                      <p className="text-xs text-amber-400 font-mono">
                        {t.handle || `@${t.name?.toLowerCase().replace(/\s+/g, "")}`}
                      </p>
                    </td>
                    <td className="px-5 py-4 font-black text-emerald-400">
                      {t.winRate}%
                    </td>
                    <td className="px-5 py-4 font-black text-amber-400 text-base">
                      +{t.roi30d}%
                    </td>
                    <td className="px-5 py-4 font-bold text-white">
                      {t.copiers || 0}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-block rounded-md border px-2.5 py-0.5 text-xs font-extrabold ${
                          t.risk === "Low"
                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                            : t.risk === "Medium"
                              ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                              : "bg-rose-500/20 border-rose-500/40 text-rose-400"
                        }`}
                      >
                        {t.risk} Risk
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteTrader(t.id, t.name)}
                        className="rounded-lg bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/20"
                      >
                        Remove 🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Master Trader Modal */}
      {modalOpen ? (
        <Modal title="Create Master Trader Profile" onClose={() => setModalOpen(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Trader Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Mercer"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white font-bold outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Social Handle
                </label>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="@alexmercer"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-amber-400 font-mono outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Win Rate %
                </label>
                <input
                  type="number"
                  value={winRate}
                  onChange={(e) => setWinRate(e.target.value)}
                  placeholder="78"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-emerald-400 font-mono font-bold outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  30D ROI %
                </label>
                <input
                  type="number"
                  value={roi30d}
                  onChange={(e) => setRoi30d(e.target.value)}
                  placeholder="42"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-amber-400 font-mono font-bold outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Risk Level
                </label>
                <select
                  value={risk}
                  onChange={(e) => setRisk(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white font-bold outline-none focus:border-amber-400"
                >
                  <option value="Low">Low Risk</option>
                  <option value="Medium">Medium Risk</option>
                  <option value="High">High Risk</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Bio / Strategy Description
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="BTC/ETH swing specialist with strict risk management..."
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none focus:border-amber-400"
                rows={3}
              />
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
                onClick={onCreateTrader}
                disabled={submitting}
                className="rounded-xl bg-amber-400 px-5 py-2 text-xs font-bold text-slate-950 shadow-md hover:bg-amber-300"
              >
                {submitting ? "Creating..." : "Create Trader Profile"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
