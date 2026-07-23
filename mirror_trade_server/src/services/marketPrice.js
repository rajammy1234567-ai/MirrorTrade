/**
 * Public market prices (no API key) — Binance spot ticker.
 * Used to mark copy positions to market.
 */
const axios = require("axios");

const cache = new Map(); // symbol -> { price, at }
const TTL_MS = 15_000;

async function fetchBinancePrice(symbol) {
  const { data } = await axios.get("https://api.binance.com/api/v3/ticker/price", {
    params: { symbol: String(symbol).toUpperCase() },
    timeout: 8000,
  });
  const price = Number(data.price);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`Invalid price for ${symbol}`);
  }
  return price;
}

/**
 * Get last price for a symbol with short in-memory cache.
 * Falls back to provided fallback if network fails.
 */
async function getPrice(symbol, fallback = null) {
  const key = String(symbol).toUpperCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.price;

  try {
    const price = await fetchBinancePrice(key);
    cache.set(key, { price, at: Date.now() });
    return price;
  } catch (err) {
    if (fallback != null && Number.isFinite(fallback)) return Number(fallback);
    if (hit) return hit.price;
    throw err;
  }
}

/**
 * Batch prices for many symbols (deduped).
 * @returns {Record<string, number>}
 */
async function getPrices(symbols) {
  const unique = [...new Set(symbols.map((s) => String(s).toUpperCase()))];
  const out = {};
  await Promise.all(
    unique.map(async (sym) => {
      try {
        out[sym] = await getPrice(sym);
      } catch {
        // leave missing — caller uses entry as fallback
      }
    })
  );
  return out;
}

module.exports = { getPrice, getPrices };
