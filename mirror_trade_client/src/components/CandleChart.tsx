import React, { useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import Svg, { Line, Rect } from "react-native-svg";
import { colors } from "../theme/colors";
import { Candle, generateCandles } from "../utils/chartData";

type Props = {
  candles?: Candle[];
  height?: number;
  seed?: number;
  start?: number;
};

/**
 * Mini / mid candlestick pane — exchange-style green/red bodies.
 */
export default function CandleChart({
  candles: input,
  height = 120,
  seed = 7,
  start = 43000,
}: Props) {
  const [width, setWidth] = useState(0);
  const candles = useMemo(
    () => input || generateCandles({ points: 36, start, seed, drift: 0.0028 }),
    [input, start, seed]
  );

  const layout = useMemo(() => {
    if (!candles.length || width <= 0) return [];
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const min = Math.min(...lows);
    const max = Math.max(...highs);
    const span = max - min || 1;
    const pad = 8;
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
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    alignSelf: "stretch",
  },
});
