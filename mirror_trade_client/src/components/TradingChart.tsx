import React, { useMemo, useState } from "react";
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";
import { colors } from "../theme/colors";
import {
  formatAxisMoney,
  generateSeries,
  seriesToVolumes,
} from "../utils/chartData";

export type ChartRange = "1D" | "1W" | "1M" | "3M" | "ALL";

type Props = {
  /** Base series; will be sliced by range. If empty, generated. */
  data?: number[];
  height?: number;
  color?: string;
  positive?: boolean;
  showVolume?: boolean;
  showAxis?: boolean;
  showRanges?: boolean;
  labels?: string[];
  seed?: number;
  startPrice?: number;
};

type Pt = { x: number; y: number; v: number };

function smoothPath(pts: Pt[]): string {
  if (!pts.length) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

  // Cardinal spline → cubic bezier (tension 0.2 = market-chart feel)
  const tension = 0.2;
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const cp1x = p1.x + ((p2.x - p0.x) * tension) / 1.2;
    const cp1y = p1.y + ((p2.y - p0.y) * tension) / 1.2;
    const cp2x = p2.x - ((p3.x - p1.x) * tension) / 1.2;
    const cp2y = p2.y - ((p3.y - p1.y) * tension) / 1.2;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

function sliceForRange(data: number[], range: ChartRange): number[] {
  const n = data.length;
  const map: Record<ChartRange, number> = {
    "1D": Math.max(12, Math.floor(n * 0.12)),
    "1W": Math.max(18, Math.floor(n * 0.22)),
    "1M": Math.max(28, Math.floor(n * 0.4)),
    "3M": Math.max(40, Math.floor(n * 0.7)),
    ALL: n,
  };
  const take = Math.min(n, map[range]);
  return data.slice(n - take);
}

const RANGES: ChartRange[] = ["1D", "1W", "1M", "3M", "ALL"];

export default function TradingChart({
  data: inputData,
  height = 200,
  color,
  positive = true,
  showVolume = true,
  showAxis = true,
  showRanges = true,
  labels,
  seed = 42,
  startPrice = 9800,
}: Props) {
  const [width, setWidth] = useState(0);
  const [range, setRange] = useState<ChartRange>("1M");
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [uid] = useState(() => Math.random().toString(36).slice(2, 8));

  const fullSeries = useMemo(() => {
    if (inputData && inputData.length > 8) return inputData;
    return generateSeries({
      points: 80,
      start: startPrice,
      drift: positive ? 0.0038 : -0.0015,
      volatility: 0.011,
      seed,
    });
  }, [inputData, startPrice, positive, seed]);

  const series = useMemo(
    () => sliceForRange(fullSeries, range),
    [fullSeries, range]
  );
  const volumes = useMemo(
    () => seriesToVolumes(series, seed + 3),
    [series, seed]
  );

  const isUp =
    series.length > 1 ? series[series.length - 1] >= series[0] : positive;
  const lineColor = color || (isUp ? colors.profit : colors.loss);

  const axisW = showAxis ? 48 : 0;
  const volH = showVolume ? Math.max(28, height * 0.18) : 0;
  const chartH = height - volH - (showRanges ? 0 : 0);
  const plotW = Math.max(0, width - axisW);
  const padT = 12;
  const padB = 8;
  const padX = 4;

  const layout = useMemo(() => {
    if (!series.length || plotW <= 0) {
      return {
        pts: [] as Pt[],
        line: "",
        area: "",
        min: 0,
        max: 0,
        yTicks: [] as { y: number; label: string }[],
        volRects: [] as { x: number; y: number; w: number; h: number; up: boolean }[],
        end: null as Pt | null,
      };
    }

    const min = Math.min(...series);
    const max = Math.max(...series);
    const pad = (max - min) * 0.08 || max * 0.01;
    const lo = min - pad;
    const hi = max + pad;
    const span = hi - lo || 1;
    const usableH = chartH - padT - padB;
    const usableW = plotW - padX * 2;

    const pts: Pt[] = series.map((v, i) => {
      const x = padX + (i / Math.max(series.length - 1, 1)) * usableW;
      const y = padT + (1 - (v - lo) / span) * usableH;
      return { x, y, v };
    });

    const line = smoothPath(pts);
    const first = pts[0];
    const last = pts[pts.length - 1];
    const area = `${line} L ${last.x.toFixed(2)} ${chartH} L ${first.x.toFixed(2)} ${chartH} Z`;

    // 4 horizontal price levels
    const yTicks = [0, 0.33, 0.66, 1].map((t) => {
      const val = hi - t * span;
      const y = padT + t * usableH;
      return { y, label: formatAxisMoney(val) };
    });

    const maxVol = Math.max(...volumes, 1);
    const barGap = 1;
    const barW = Math.max(
      1.5,
      usableW / series.length - barGap
    );
    const volRects = volumes.map((vol, i) => {
      const h = (vol / maxVol) * (volH - 4);
      const x = padX + (i / Math.max(series.length - 1, 1)) * usableW - barW / 2;
      const up = i === 0 ? true : series[i] >= series[i - 1];
      return {
        x: Math.max(0, x),
        y: volH - h,
        w: barW,
        h,
        up,
      };
    });

    return { pts, line, area, min: lo, max: hi, yTicks, volRects, end: last };
  }, [series, volumes, plotW, chartH, volH, padT, padB, padX]);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - width) > 0.5) setWidth(w);
  };

  const onChartPress = (locationX: number) => {
    if (!layout.pts.length || plotW <= 0) return;
    const x = locationX;
    let best = 0;
    let bestDist = Infinity;
    layout.pts.forEach((p, i) => {
      const d = Math.abs(p.x - x);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setActiveIdx(best);
  };

  const active = activeIdx != null ? layout.pts[activeIdx] : null;
  const changePct =
    series.length > 1
      ? ((series[series.length - 1] - series[0]) / series[0]) * 100
      : 0;

  const xLabels =
    labels && labels.length >= 4
      ? labels
      : range === "1D"
        ? ["9:30", "12:00", "14:00", "16:00"]
        : range === "1W"
          ? ["Mon", "Tue", "Wed", "Thu", "Fri"]
          : ["Jun 1", "Jun 14", "Jun 28", "Jul 7"];

  return (
    <View style={styles.root} onLayout={onLayout}>
      {/* Live scrub value */}
      {active ? (
        <View style={styles.scrubRow}>
          <Text style={[styles.scrubPrice, { color: lineColor }]}>
            {formatAxisMoney(active.v)}
          </Text>
          <Text style={styles.scrubHint}>hold / tap chart</Text>
        </View>
      ) : (
        <View style={styles.scrubRow}>
          <Text style={[styles.rangePct, { color: lineColor }]}>
            {changePct >= 0 ? "+" : ""}
            {changePct.toFixed(2)}% · {range}
          </Text>
        </View>
      )}

      <View style={{ height }}>
        {width > 0 ? (
          <View style={styles.row}>
            <Pressable
              style={{ width: plotW, height }}
              onPress={(e) => onChartPress(e.nativeEvent.locationX)}
            >
              <Svg width={plotW} height={height}>
                <Defs>
                  <LinearGradient id={`area-${uid}`} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={lineColor} stopOpacity={0.45} />
                    <Stop offset="40%" stopColor={lineColor} stopOpacity={0.16} />
                    <Stop offset="100%" stopColor={lineColor} stopOpacity={0.01} />
                  </LinearGradient>
                  <LinearGradient id={`glow-${uid}`} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={lineColor} stopOpacity={0.9} />
                    <Stop offset="100%" stopColor={lineColor} stopOpacity={0.2} />
                  </LinearGradient>
                </Defs>

                {/* plot background tint */}
                <Rect
                  x={0}
                  y={0}
                  width={plotW}
                  height={chartH}
                  fill={lineColor}
                  opacity={0.03}
                />

                {/* grid + axis ticks */}
                {layout.yTicks.map((t, i) => (
                  <G key={`tick-${i}`}>
                    <Line
                      x1={0}
                      y1={t.y}
                      x2={plotW}
                      y2={t.y}
                      stroke={colors.border}
                      strokeWidth={1}
                      strokeDasharray="3 7"
                      opacity={0.75}
                    />
                  </G>
                ))}

                {/* area fill */}
                {layout.area ? (
                  <Path d={layout.area} fill={`url(#area-${uid})`} />
                ) : null}

                {/* soft glow stroke under main line */}
                {layout.line ? (
                  <Path
                    d={layout.line}
                    stroke={lineColor}
                    strokeWidth={7}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.14}
                  />
                ) : null}

                {/* main price line */}
                {layout.line ? (
                  <Path
                    d={layout.line}
                    stroke={lineColor}
                    strokeWidth={2.4}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}

                {/* end marker */}
                {layout.end && activeIdx == null ? (
                  <>
                    <Circle
                      cx={layout.end.x}
                      cy={layout.end.y}
                      r={10}
                      fill={lineColor}
                      opacity={0.18}
                    />
                    <Circle
                      cx={layout.end.x}
                      cy={layout.end.y}
                      r={4.5}
                      fill={lineColor}
                      stroke="#0B0E14"
                      strokeWidth={2}
                    />
                  </>
                ) : null}

                {/* crosshair */}
                {active ? (
                  <>
                    <Line
                      x1={active.x}
                      y1={0}
                      x2={active.x}
                      y2={chartH}
                      stroke={colors.muted}
                      strokeWidth={1}
                      strokeDasharray="3 4"
                      opacity={0.7}
                    />
                    <Line
                      x1={0}
                      y1={active.y}
                      x2={plotW}
                      y2={active.y}
                      stroke={colors.muted}
                      strokeWidth={1}
                      strokeDasharray="3 4"
                      opacity={0.5}
                    />
                    <Circle
                      cx={active.x}
                      cy={active.y}
                      r={6}
                      fill={lineColor}
                      stroke="#FFFFFF"
                      strokeWidth={2}
                    />
                  </>
                ) : null}

                {/* volume pane */}
                {showVolume ? (
                  <G transform={`translate(0, ${chartH})`}>
                    <Line
                      x1={0}
                      y1={0}
                      x2={plotW}
                      y2={0}
                      stroke={colors.border}
                      strokeWidth={1}
                      opacity={0.5}
                    />
                    {layout.volRects.map((b, i) => (
                      <Rect
                        key={`v-${i}`}
                        x={b.x}
                        y={b.y}
                        width={b.w}
                        height={Math.max(1, b.h)}
                        rx={1}
                        fill={b.up ? colors.profit : colors.loss}
                        opacity={0.35}
                      />
                    ))}
                  </G>
                ) : null}
              </Svg>
            </Pressable>

            {showAxis && plotW > 0 ? (
              <View style={[styles.axisCol, { height: chartH, width: axisW }]}>
                {layout.yTicks.map((t, i) => (
                  <Text
                    key={`yl-${i}`}
                    style={[styles.axisLabel, { top: Math.max(0, t.y - 7) }]}
                  >
                    {t.label}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* X labels */}
      <View style={[styles.xRow, showAxis && { paddingRight: axisW }]}>
        {xLabels.map((l) => (
          <Text key={l} style={styles.xLabel}>
            {l}
          </Text>
        ))}
      </View>

      {showRanges ? (
        <View style={styles.ranges}>
          {RANGES.map((r) => {
            const on = range === r;
            return (
              <Pressable
                key={r}
                onPress={() => {
                  setRange(r);
                  setActiveIdx(null);
                }}
                style={[styles.rangeBtn, on && styles.rangeBtnOn]}
              >
                <Text style={[styles.rangeText, on && styles.rangeTextOn]}>
                  {r}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
  },
  scrubRow: {
    minHeight: 20,
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scrubPrice: {
    fontSize: 14,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  scrubHint: {
    fontSize: 11,
    color: colors.muted,
  },
  rangePct: {
    fontSize: 12,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  row: {
    flexDirection: "row",
    width: "100%",
  },
  axisCol: {
    position: "relative",
  },
  axisLabel: {
    position: "absolute",
    right: 0,
    fontSize: 10,
    color: colors.muted,
    fontVariant: ["tabular-nums"],
    fontWeight: "500",
  },
  xRow: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  xLabel: {
    fontSize: 10,
    color: colors.muted,
    fontWeight: "500",
  },
  ranges: {
    marginTop: 12,
    flexDirection: "row",
    backgroundColor: colors.elevated,
    borderRadius: 12,
    padding: 3,
  },
  rangeBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 7,
    borderRadius: 10,
  },
  rangeBtnOn: {
    backgroundColor: colors.card,
  },
  rangeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
  },
  rangeTextOn: {
    color: colors.text,
  },
});
