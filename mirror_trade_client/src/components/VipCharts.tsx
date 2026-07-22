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
  LinearGradient as SvgGradient,
  Path,
  Rect,
  Stop,
  G,
  Text as SvgText,
} from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import type { CVipPlan, PlanStatus, PlanTransaction, TVipPlan } from "../config/api";
import { formatMoney } from "../config/currency";
import { colors } from "../theme/colors";

type Props = {
  status: PlanStatus;
  transactions?: PlanTransaction[];
  onOpenTVip?: () => void;
  onOpenCVip?: () => void;
};

/** Circular ring progress */
function RingProgress({
  percent,
  size = 120,
  stroke = 10,
  color = "#5B8CFF",
  track = "#252B3A",
  label,
  sub,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  label: string;
  sub: string;
}) {
  const p = Math.max(0, Math.min(100, percent || 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - p / 100);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={track}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.ringCenter} pointerEvents="none">
        <Text style={[styles.ringPct, { color }]}>{Math.round(p)}%</Text>
        <Text style={styles.ringLabel}>{label}</Text>
        <Text style={styles.ringSub} numberOfLines={1}>
          {sub}
        </Text>
      </View>
    </View>
  );
}

/** Vertical bars: T-VIP profit share ladder */
function ShareBarChart({
  plans,
  currentRank,
  width,
  height = 160,
}: {
  plans: TVipPlan[];
  currentRank: string;
  width: number;
  height?: number;
}) {
  const rows = plans.filter((p) => p.rank !== "DEMO" || p.profitSharePercent > 0);
  const list = rows.length ? rows : plans;
  const maxShare = Math.max(...list.map((p) => p.profitSharePercent), 1);
  const padL = 28;
  const padB = 28;
  const padT = 12;
  const padR = 8;
  const chartW = Math.max(width - padL - padR, 40);
  const chartH = height - padB - padT;
  const gap = 6;
  const barW = Math.max((chartW - gap * (list.length - 1)) / list.length, 8);

  return (
    <Svg width={width} height={height}>
      <Defs>
        <SvgGradient id="barGrad" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor="#4F6EF7" stopOpacity="0.55" />
          <Stop offset="1" stopColor="#8B5CF6" stopOpacity="1" />
        </SvgGradient>
        <SvgGradient id="barActive" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor="#00A86B" stopOpacity="0.7" />
          <Stop offset="1" stopColor="#00D084" stopOpacity="1" />
        </SvgGradient>
      </Defs>
      {/* grid lines */}
      {[0.25, 0.5, 0.75, 1].map((f) => {
        const y = padT + chartH * (1 - f);
        return (
          <Path
            key={f}
            d={`M ${padL} ${y} L ${width - padR} ${y}`}
            stroke={colors.border}
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        );
      })}
      {list.map((plan, i) => {
        const h = (plan.profitSharePercent / maxShare) * chartH;
        const x = padL + i * (barW + gap);
        const y = padT + chartH - h;
        const active = plan.rank === currentRank;
        const short = plan.rank.replace("T-VIP-", "T").replace("DEMO", "D");
        return (
          <G key={plan.rank}>
            <Rect
              x={x}
              y={y}
              width={barW}
              height={Math.max(h, 2)}
              rx={6}
              fill={active ? "url(#barActive)" : "url(#barGrad)"}
              opacity={active ? 1 : 0.75}
            />
            {active ? (
              <Circle
                cx={x + barW / 2}
                cy={y - 6}
                r={3.5}
                fill={colors.profit}
              />
            ) : null}
            <SvgText
              x={x + barW / 2}
              y={height - 10}
              fill={active ? colors.profit : colors.muted}
              fontSize={9}
              fontWeight={active ? "700" : "500"}
              textAnchor="middle"
            >
              {short}
            </SvgText>
            {plan.profitSharePercent > 0 ? (
              <SvgText
                x={x + barW / 2}
                y={y - 10}
                fill={active ? colors.profit : colors.muted}
                fontSize={8}
                fontWeight="600"
                textAnchor="middle"
              >
                {plan.profitSharePercent}%
              </SvgText>
            ) : null}
          </G>
        );
      })}
      <SvgText x={4} y={padT + 4} fill={colors.muted} fontSize={8}>
        %
      </SvgText>
    </Svg>
  );
}

/** Horizontal stacked progress for C-VIP 3 conditions */
function CVipConditionChart({
  status,
  next,
}: {
  status: PlanStatus;
  next: CVipPlan | null;
}) {
  const metrics = [
    {
      key: "cap",
      label: "Capital",
      color: "#F7A600",
      percent: status.cVipProgress?.deposit?.percent ?? 0,
      meta: next
        ? `${formatMoney(status.totalDeposit, { decimals: 0 })} / ${formatMoney(next.minDeposit, { decimals: 0 })}`
        : formatMoney(status.totalDeposit, { decimals: 0 }),
    },
    {
      key: "dir",
      label: "Directs",
      color: "#5B8CFF",
      percent: status.cVipProgress?.directs?.percent ?? 0,
      meta: next
        ? `${status.directs} / ${next.minDirects}`
        : String(status.directs),
    },
    {
      key: "team",
      label: "Team biz",
      color: "#00D084",
      percent: status.cVipProgress?.teamBusiness?.percent ?? 0,
      meta: next
        ? `${formatMoney(status.teamBusiness, { decimals: 0 })} / ${formatMoney(next.minTeamBusiness, { decimals: 0 })}`
        : formatMoney(status.teamBusiness, { decimals: 0 }),
    },
  ];

  return (
    <View style={styles.condChart}>
      {metrics.map((m) => {
        const p = Math.max(0, Math.min(100, m.percent || 0));
        return (
          <View key={m.key} style={styles.condRow}>
            <View style={styles.condTop}>
              <Text style={styles.condLabel}>{m.label}</Text>
              <Text style={[styles.condMeta, { color: m.color }]}>{m.meta}</Text>
            </View>
            <View style={styles.condTrack}>
              <View
                style={[
                  styles.condFill,
                  { width: `${p}%`, backgroundColor: m.color },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Capital / activity area chart from transactions */
function ActivityAreaChart({
  transactions,
  capital,
  width,
  height = 100,
}: {
  transactions: PlanTransaction[];
  capital: number;
  width: number;
  height?: number;
}) {
  const series = useMemo(() => {
    const deposits = transactions
      .filter((t) => t.type === "DEPOSIT" || t.type === "T_VIP_PROFIT_SHARE")
      .slice()
      .reverse();

    if (deposits.length >= 2) {
      let running = Math.max(0, capital);
      // reconstruct backwards approx
      const pts: number[] = [capital];
      for (let i = 0; i < Math.min(deposits.length, 12); i++) {
        running = Math.max(0, running - Math.abs(Number(deposits[i].amount) || 0) * 0.3);
        pts.unshift(running);
      }
      // normalize to end at capital
      const last = pts[pts.length - 1] || 1;
      const scale = capital > 0 ? capital / Math.max(last, 0.01) : 1;
      return pts.map((v) => v * scale);
    }

    // smooth synthetic path ending at current capital
    const end = Math.max(capital, 1);
    const start = Math.max(end * 0.35, 1);
    const out: number[] = [];
    for (let i = 0; i < 24; i++) {
      const t = i / 23;
      const ease = t * t * (3 - 2 * t);
      const wave = Math.sin(t * Math.PI * 2.2) * end * 0.04;
      out.push(start + (end - start) * ease + wave);
    }
    return out;
  }, [transactions, capital]);

  const path = useMemo(() => {
    if (!series.length || width <= 0) return { line: "", area: "" };
    const min = Math.min(...series);
    const max = Math.max(...series);
    const span = max - min || 1;
    const pad = 4;
    const pts = series.map((v, i) => {
      const x = (i / (series.length - 1)) * width;
      const y = pad + (1 - (v - min) / span) * (height - pad * 2);
      return { x, y };
    });
    let line = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      line += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    const area = `${line} L ${width} ${height} L 0 ${height} Z`;
    return { line, area, end: pts[pts.length - 1] };
  }, [series, width, height]);

  if (width <= 0) return <View style={{ height }} />;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <SvgGradient id="vipArea" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#5B8CFF" stopOpacity="0.45" />
          <Stop offset="1" stopColor="#5B8CFF" stopOpacity="0.02" />
        </SvgGradient>
      </Defs>
      {path.area ? <Path d={path.area} fill="url(#vipArea)" /> : null}
      {path.line ? (
        <Path
          d={path.line}
          stroke="#8BA3FF"
          strokeWidth={2.2}
          fill="none"
          strokeLinecap="round"
        />
      ) : null}
      {path.end ? (
        <Circle cx={path.end.x} cy={path.end.y} r={4} fill={colors.profit} />
      ) : null}
    </Svg>
  );
}

/**
 * VIP overview charts block — rings, share bars, C-VIP conditions, capital curve.
 */
export default function VipCharts({
  status,
  transactions = [],
  onOpenTVip,
  onOpenCVip,
}: Props) {
  const [barW, setBarW] = useState(0);
  const [areaW, setAreaW] = useState(0);

  const capital = status.exchangeCapital ?? status.totalDeposit ?? 0;
  const tPct = Math.max(
    0,
    Math.min(100, Number(status.tVipProgress?.percent) || 0)
  );
  const cAvg = status.cVipProgress
    ? Math.round(
        (Math.min(100, status.cVipProgress.deposit.percent || 0) +
          Math.min(100, status.cVipProgress.directs.percent || 0) +
          Math.min(100, status.cVipProgress.teamBusiness.percent || 0)) /
          3
      )
    : status.cVipRank && status.cVipRank !== "NONE"
      ? 100
      : 0;

  const tPlans = status.plans?.tVip ?? [];

  return (
    <View style={styles.wrap}>
      <Text style={styles.blockTitle}>Level analytics</Text>

      {/* Dual rings */}
      <View style={styles.ringsRow}>
        <Pressable style={styles.ringCard} onPress={onOpenTVip}>
          <RingProgress
            percent={tPct}
            color="#5B8CFF"
            label="T-VIP"
            sub={status.nextTVip?.rank || "Max"}
          />
          <Text style={styles.ringCaption}>
            {status.tVipRank || "NONE"} · {status.tVipProfitSharePercent}% share
          </Text>
        </Pressable>
        <Pressable style={styles.ringCard} onPress={onOpenCVip}>
          <RingProgress
            percent={cAvg}
            color="#F7A600"
            label="C-VIP"
            sub={status.nextCVip?.rank || "Max"}
          />
          <Text style={styles.ringCaption}>
            {status.cVipRank || "NONE"} · {status.directs} directs
          </Text>
        </Pressable>
      </View>

      {/* T-VIP profit share bars */}
      <View style={styles.chartCard}>
        <View style={styles.chartHead}>
          <View>
            <Text style={styles.chartTitle}>T-VIP profit share</Text>
            <Text style={styles.chartSub}>Level ladder · higher bar = higher %</Text>
          </View>
          <Pressable onPress={onOpenTVip} hitSlop={8}>
            <Ionicons name="expand-outline" size={18} color={colors.muted} />
          </Pressable>
        </View>
        <View
          onLayout={(e: LayoutChangeEvent) =>
            setBarW(e.nativeEvent.layout.width)
          }
          style={styles.chartBody}
        >
          {barW > 0 ? (
            <ShareBarChart
              plans={tPlans}
              currentRank={status.tVipRank || "NONE"}
              width={barW}
              height={168}
            />
          ) : (
            <View style={{ height: 168 }} />
          )}
        </View>
      </View>

      {/* C-VIP conditions */}
      <View style={[styles.chartCard, styles.chartCardGold]}>
        <View style={styles.chartHead}>
          <View>
            <Text style={styles.chartTitle}>C-VIP requirements</Text>
            <Text style={styles.chartSub}>
              {status.nextCVip
                ? `Progress to ${status.nextCVip.rank}`
                : "All conditions met"}
            </Text>
          </View>
          <Pressable onPress={onOpenCVip} hitSlop={8}>
            <Ionicons name="expand-outline" size={18} color={colors.muted} />
          </Pressable>
        </View>
        <CVipConditionChart status={status} next={status.nextCVip} />
      </View>

      {/* Capital curve */}
      <View style={styles.chartCard}>
        <View style={styles.chartHead}>
          <View>
            <Text style={styles.chartTitle}>Capital trend</Text>
            <Text style={styles.chartSub}>
              Exchange capital base · {formatMoney(capital, { decimals: 0 })}
            </Text>
          </View>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
        <View
          onLayout={(e: LayoutChangeEvent) =>
            setAreaW(e.nativeEvent.layout.width)
          }
          style={styles.chartBody}
        >
          <ActivityAreaChart
            transactions={transactions}
            capital={capital}
            width={areaW}
            height={110}
          />
        </View>
      </View>
    </View>
  );
}

/** Compact sparkline for Assets menu row */
export function VipMiniSpark({
  capital = 100,
  positive = true,
}: {
  capital?: number;
  positive?: boolean;
}) {
  const [w, setW] = useState(0);
  const data = useMemo(() => {
    const end = Math.max(capital, 10);
    const out: number[] = [];
    for (let i = 0; i < 16; i++) {
      const t = i / 15;
      out.push(end * (0.4 + 0.6 * t) + Math.sin(t * 6) * end * 0.03);
    }
    return out;
  }, [capital]);

  const d = useMemo(() => {
    if (!w || !data.length) return "";
    const min = Math.min(...data);
    const max = Math.max(...data);
    const span = max - min || 1;
    const h = 28;
    return data
      .map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = 2 + (1 - (v - min) / span) * (h - 4);
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  }, [data, w]);

  return (
    <View
      style={{ width: 72, height: 28 }}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
    >
      {w > 0 && d ? (
        <Svg width={w} height={28}>
          <Path
            d={d}
            stroke={positive ? colors.profit : colors.primary}
            strokeWidth={1.8}
            fill="none"
            strokeLinecap="round"
          />
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8, marginBottom: 8 },
  blockTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 12,
  },
  ringsRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  ringCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    alignItems: "center",
  },
  ringCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    width: 120,
    height: 120,
  },
  ringPct: { fontSize: 22, fontWeight: "900" },
  ringLabel: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
    letterSpacing: 0.5,
  },
  ringSub: { color: colors.muted, fontSize: 9, marginTop: 1, maxWidth: 90 },
  ringCaption: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 8,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 6,
  },
  chartCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
  },
  chartCardGold: {
    borderColor: "rgba(247,166,0,0.28)",
  },
  chartHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  chartTitle: { color: colors.text, fontSize: 15, fontWeight: "800" },
  chartSub: { color: colors.muted, fontSize: 11, marginTop: 3 },
  chartBody: { width: "100%" },
  condChart: { gap: 12 },
  condRow: {},
  condTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  condLabel: { color: colors.text, fontSize: 12, fontWeight: "700" },
  condMeta: { fontSize: 11, fontWeight: "700" },
  condTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.elevated,
    overflow: "hidden",
  },
  condFill: { height: "100%", borderRadius: 4 },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,208,132,0.12)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.profit,
  },
  liveText: { color: colors.profit, fontSize: 10, fontWeight: "800" },
});
