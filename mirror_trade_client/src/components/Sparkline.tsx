import React, { useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View, ViewStyle } from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";
import { colors } from "../theme/colors";
import { generateSeries } from "../utils/chartData";

type Props = {
  data?: number[];
  width?: number;
  height?: number;
  positive?: boolean;
  fill?: boolean;
  color?: string;
  showEndDot?: boolean;
  strokeWidth?: number;
  style?: ViewStyle;
  seed?: number;
};

type Point = { x: number; y: number };

function smoothPath(pts: Point[]): string {
  if (!pts.length) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

/** Compact sparkline for cards — denser realistic series if data short */
export default function Sparkline({
  data: input,
  width: fixedWidth,
  height = 40,
  positive = true,
  fill = true,
  color,
  showEndDot = true,
  strokeWidth = 2,
  style,
  seed = 21,
}: Props) {
  const [measuredW, setMeasuredW] = useState(0);
  const [uid] = useState(() => Math.random().toString(36).slice(2, 8));
  const width = fixedWidth ?? measuredW;
  const stroke = color || (positive ? colors.profit : colors.loss);

  const data = useMemo(() => {
    if (input && input.length >= 12) return input;
    return generateSeries({
      points: 28,
      start: 100,
      drift: positive ? 0.01 : -0.006,
      volatility: 0.02,
      seed,
    });
  }, [input, positive, seed]);

  const chart = useMemo(() => {
    if (!data.length || width <= 0) {
      return { line: "", area: "", end: null as Point | null };
    }
    const min = Math.min(...data);
    const max = Math.max(...data);
    const padT = showEndDot ? 6 : 3;
    const padB = 2;
    const padX = 2;
    const range = max - min || 1;
    const usableH = height - padT - padB;
    const usableW = width - padX * 2;
    const pts: Point[] = data.map((v, i) => ({
      x: padX + (i / Math.max(data.length - 1, 1)) * usableW,
      y: padT + (1 - (v - min) / range) * usableH,
    }));
    const line = smoothPath(pts);
    const last = pts[pts.length - 1];
    const first = pts[0];
    const area = `${line} L ${last.x.toFixed(2)} ${height} L ${first.x.toFixed(2)} ${height} Z`;
    return { line, area, end: last };
  }, [data, width, height, showEndDot]);

  return (
    <View
      style={[styles.wrap, { height }, !fixedWidth && styles.flex, style]}
      onLayout={(e: LayoutChangeEvent) => {
        if (fixedWidth) return;
        const w = e.nativeEvent.layout.width;
        if (w > 0 && Math.abs(w - measuredW) > 0.5) setMeasuredW(w);
      }}
    >
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={`s-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={stroke} stopOpacity={0.4} />
              <Stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
            </LinearGradient>
          </Defs>
          {fill && chart.area ? (
            <Path d={chart.area} fill={`url(#s-${uid})`} />
          ) : null}
          {chart.line ? (
            <Path
              d={chart.line}
              stroke={stroke}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          {showEndDot && chart.end ? (
            <Circle
              cx={chart.end.x}
              cy={chart.end.y}
              r={3}
              fill={stroke}
              stroke="#0B0E14"
              strokeWidth={1.5}
            />
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden" },
  flex: { width: "100%", alignSelf: "stretch" },
});
