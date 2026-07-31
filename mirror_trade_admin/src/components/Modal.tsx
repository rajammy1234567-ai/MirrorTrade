import { useEffect, type ReactNode } from "react";

export default function Modal({
  open = true,
  title,
  subtitle,
  onClose,
  children,
  wide,
}: {
  open?: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${wide ? "max-w-xl" : "max-w-md"} rounded-2xl border border-slate-800 bg-slate-950 text-slate-100 shadow-2xl overflow-hidden`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 bg-slate-900/60 px-5 py-4">
          <div>
            <h3 className="text-base font-bold text-white">{title}</h3>
            {subtitle ? (
              <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
