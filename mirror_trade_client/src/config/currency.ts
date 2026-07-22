/**
 * App display currency — switch here only.
 * Values in API stay numeric; UI shows this symbol/code.
 */
export const CURRENCY_SYMBOL = "₹";
export const CURRENCY_CODE = "INR";
export const CURRENCY_LABEL = "INR";

/** Format amount: ₹1,250 or ₹1,250.50 */
export function formatMoney(
  amount: number | string | null | undefined,
  opts?: { decimals?: number; signed?: boolean }
): string {
  const n = Number(amount ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  const decimals = opts?.decimals ?? (Number.isInteger(safe) ? 0 : 2);
  let abs: string;
  try {
    abs = Math.abs(safe).toLocaleString("en-IN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  } catch {
    abs = Math.abs(safe).toFixed(decimals);
  }
  if (opts?.signed) {
    const sign = safe > 0 ? "+" : safe < 0 ? "-" : "";
    return `${sign}${CURRENCY_SYMBOL}${abs}`;
  }
  if (safe < 0) return `-${CURRENCY_SYMBOL}${abs}`;
  return `${CURRENCY_SYMBOL}${abs}`;
}

/** Compact: ₹1.2k / ₹1.5L */
export function formatMoneyCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_00_00_000) return `${CURRENCY_SYMBOL}${(n / 1_00_00_000).toFixed(2)}Cr`;
  if (abs >= 1_00_000) return `${CURRENCY_SYMBOL}${(n / 1_00_000).toFixed(2)}L`;
  if (abs >= 1000) return `${CURRENCY_SYMBOL}${(n / 1000).toFixed(1)}k`;
  return formatMoney(n, { decimals: 0 });
}
