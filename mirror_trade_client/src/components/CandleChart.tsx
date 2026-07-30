import React, { useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import Svg, { Line, Rect } from "react-native-svg";
import { colors } from "../theme/colors";
import { CandleData } from "../config/api";
import { Candle, generateCandles } from "../utils/chartData";

type Props = {
  candles?: (Candle | CandleData)[];
  height?: number;
  seed?: number;
  start?: number;
  pairLabel?: string;
};

/**
 * Mini / mid candlestick pane — exchange-style green/red bodies.
 */
export default function CandleChart({
  candles: input,
  height = 140,
  seed = 7,
  start = 43000,
  pairLabel = "BTC/USDT",
}: Props) {
  const [width, setWidth] = useState(0);
  const candles = useMemo(
    () => input || generateCandles({ points: 36, start, seed, drift: 0.0028 }),
    [input, start, seed]
  );

  const priceStats = useMemo(() => {
    if (!candles.length) return { min: 0, max: 0, last: 0 };
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const min = Math.min(...lows);
    const max = Math.max(...highs);
    const last = candles[candles.length - 1]?.close || 0;
    return { min, max, last };
  }, [candles]);

  const layout = useMemo(() => {
    if (!candles.length || width <= 0) return [];
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const min = Math.min(...lows);
    const max = Math.max(...highs);
    const span = max - min || 1;
    const pad = 12;
    const usableH = height - pad * 2;
    const gap = 2;
    const bodyW = Math.max(3, width / candles.length - gap);

    return candles.map((c, i) => {
      const x = (i + 0.5) * (width / candles.length);
      const yHigh = pad + (1 - (c.high - min) / span) * usableH;
      const yLow = pad + (1 - (c.low - min) / span) * usableH;
      const yOpen = pad + (1 - (c.open - min) / span) * usableH;
      const yClose = pad + (1 - (c.close - min) / span) * usableH;
      const up = c.close >= c.open;
      const top = Math.min(yOpen, yClose);
      const bodyH = Math.max(1.5, Math.abs(yClose - yOpen));
      return {
        x,
        yHigh,
        yLow,
        top,
        bodyH,
        bodyW,
        up,
      };
    });
  }, [candles, width, height]);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - width) > 0.5) setWidth(w);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.pair}>{pairLabel}</Text>
          <Text style={styles.sub}>1H Live Candlestick (Binance)</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.price}>
            ${priceStats.last ? priceStats.last.toLocaleString() : "—"}
          </Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
      </View>

      <View style={[styles.wrap, { height }]} onLayout={onLayout}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            {layout.map((c, i) => (
              <React.Fragment key={i}>
                <Line
                  x1={c.x}
                  y1={c.yHigh}
                  x2={c.x}
                  y2={c.yLow}
                  stroke={c.up ? colors.profit : colors.loss}
                  strokeWidth={1.2}
                  opacity={0.85}
                />
                <Rect
                  x={c.x - c.bodyW / 2}
                  y={c.top}
                  width={c.bodyW}
                  height={c.bodyH}
                  rx={1}
                  fill={c.up ? colors.profit : colors.loss}
                  opacity={0.92}
                />
              </React.Fragment>
            ))}
          </Svg>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  headerLeft: {
    flex: 1,
  },
  pair: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  sub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  price: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.profit,
  },
  liveText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.profit,
    letterSpacing: 0.5,
  },
  wrap: {
    width: "100%",
    alignSelf: "stretch",
  },
});
