/**
 * Realistic market-style series for charts (trend + noise + mean reversion).
 * Seeded so UI stays stable between re-renders.
 */

function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Candle = {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

/** Random-walk equity/price curve with higher-highs feel when drift > 0 */
export function generateSeries(opts: {
  points?: number;
  start?: number;
  drift?: number; // avg upward drift per step
  volatility?: number;
  seed?: number;
}): number[] {
  const {
    points = 64,
    start = 9800,
    drift = 0.004,
    volatility = 0.012,
    seed = 42,
  } = opts;
  const rnd = mulberry32(seed);
  const out: number[] = [start];
  let v = start;
  for (let i = 1; i < points; i++) {
    // Box-Muller-ish single sample
    const z = (rnd() + rnd() + rnd() + rnd() - 2) / 1.2;
    const shock = z * volatility;
    // mild mean pull + upward drift
    const pull = (start * (1 + drift * i) - v) * 0.02;
    v = Math.max(v * (1 + drift + shock) + pull, start * 0.55);
    out.push(Number(v.toFixed(2)));
  }
  return out;
}

/** Candles for more "exchange app" look */
export function generateCandles(opts: {
  points?: number;
  start?: number;
  drift?: number;
  seed?: number;
}): Candle[] {
  const { points = 40, start = 42000, drift = 0.003, seed = 7 } = opts;
  const closes = generateSeries({
    points,
    start,
    drift,
    volatility: 0.015,
    seed,
  });
  const rnd = mulberry32(seed + 99);
  const candles: Candle[] = [];
  for (let i = 0; i < closes.length; i++) {
    const close = closes[i];
    const open = i === 0 ? start : closes[i - 1];
    const body = Math.abs(close - open);
    const wick = body * (0.4 + rnd() * 1.2) + close * 0.0015;
    const high = Math.max(open, close) + wick * rnd();
    const low = Math.min(open, close) - wick * rnd();
    const volume = 800 + rnd() * 4200 + body * 2;
    candles.push({
      open,
      high,
      low,
      close,
      volume: Math.round(volume),
    });
  }
  return candles;
}

export function seriesToVolumes(series: number[], seed = 11): number[] {
  const rnd = mulberry32(seed);
  return series.map((v, i) => {
    const prev = i === 0 ? v : series[i - 1];
    const move = Math.abs(v - prev);
    return Math.round(400 + move * 8 + rnd() * 900);
  });
}

export function formatAxisMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `$${(n / 1000).toFixed(1)}k`;
  if (n >= 1000) return `$${(n / 1000).toFixed(2)}k`;
  return `$${n.toFixed(0)}`;
}

export function formatCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toFixed(0);
}
