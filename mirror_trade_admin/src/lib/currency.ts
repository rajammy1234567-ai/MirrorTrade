export const CURRENCY_SYMBOL = "$";
export const CURRENCY_CODE = "USD";
export const CURRENCY_UNIT = "USDT";

export function formatMoney(
  amount: number | string | null | undefined,
  decimals = 2
): string {
  const n = Number(amount ?? 0);
  const abs = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  if (n < 0) return `-${CURRENCY_SYMBOL}${abs}`;
  return `${CURRENCY_SYMBOL}${abs}`;
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function shortHash(hash?: string | null, head = 8, tail = 6) {
  if (!hash) return "—";
  if (hash.length <= head + tail + 3) return hash;
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`;
}
