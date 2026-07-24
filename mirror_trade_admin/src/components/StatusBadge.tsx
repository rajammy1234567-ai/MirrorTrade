const STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  inactive: "bg-slate-100 text-slate-600 ring-slate-500/10",
  pending: "bg-amber-50 text-amber-800 ring-amber-600/15",
  credited: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  rejected: "bg-rose-50 text-rose-700 ring-rose-600/15",
  admin: "bg-violet-50 text-violet-700 ring-violet-600/15",
  user: "bg-sky-50 text-sky-700 ring-sky-600/15",
};

export default function StatusBadge({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  const key = status.toLowerCase();
  const cls = STYLES[key] || "bg-slate-100 text-slate-700 ring-slate-500/10";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${cls}`}
    >
      {label || status}
    </span>
  );
}
