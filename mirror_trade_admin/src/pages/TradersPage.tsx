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
  const [winRate, setWinRate] = useState("75");
  const [roi30d, setRoi30d] = useState("35");
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
      setSuccess(`Master Trader ${name} profile created!`);
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
    <div>
      <PageHeader
        title="Master Traders Management"
        description="Manage top copy-traders available for users to copy."
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
              + Add Master Trader
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
          <p className="px-5 py-12 text-center text-slate-500">Loading traders…</p>
        ) : traders.length === 0 ? (
          <EmptyState
            title="No master traders"
            description="Click '+ Add Master Trader' to add copy-trader profiles."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Trader</th>
                  <th className="px-4 py-3 font-semibold">Win Rate</th>
                  <th className="px-4 py-3 font-semibold">30d ROI</th>
                  <th className="px-4 py-3 font-semibold">Risk Level</th>
                  <th className="px-4 py-3 font-semibold">Copiers</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {traders.map((t) => (
                  <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{t.name}</p>
                      <p className="text-xs text-slate-500">{t.handle}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-600">{t.winRate}%</td>
                    <td className="px-4 py-3 font-semibold text-blue-600">+{t.roi30d}%</td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {t.risk}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{t.copiers || 0}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => onDeleteTrader(t.id, t.name)}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Master Trader"
        subtitle="Create a new trader profile available for copy trading"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Mercer"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Handle (optional)</label>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="@alexmercer"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Win Rate (%)</label>
              <input
                type="number"
                value={winRate}
                onChange={(e) => setWinRate(e.target.value)}
                placeholder="78"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">30d ROI (%)</label>
              <input
                type="number"
                value={roi30d}
                onChange={(e) => setRoi30d(e.target.value)}
                placeholder="42"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Risk</label>
              <select
                value={risk}
                onChange={(e) => setRisk(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              placeholder="BTC & ETH swing specialist..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
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
              onClick={onCreateTrader}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-blue-500"
            >
              {submitting ? "Creating…" : "Create Trader"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
