export const CURRENCY_SYMBOL = "$";
export const CURRENCY_CODE = "USD";

export function formatMoney(
  amount: number | string | null | undefined,
  decimals = 0
): string {
  const n = Number(amount ?? 0);
  const abs = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  if (n < 0) return `-${CURRENCY_SYMBOL}${abs}`;
  return `${CURRENCY_SYMBOL}${abs}`;
}
