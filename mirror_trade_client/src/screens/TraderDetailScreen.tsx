import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Screen from "../components/Screen";
import TradingChart from "../components/TradingChart";
import CandleChart from "../components/CandleChart";
import PnlText from "../components/PnlText";
import GradientButton from "../components/GradientButton";
import {
  getApiErrorMessage,
  getTraderRequest,
  type ApiTrader,
} from "../config/api";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "TraderDetail">;
const timeframes = ["7D", "30D", "90D", "All"] as const;

export default function TraderDetailScreen({ route, navigation }: Props) {
  const [trader, setTrader] = useState<ApiTrader | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tf, setTf] = useState<(typeof timeframes)[number]>("30D");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getTraderRequest(route.params.traderId);
      if (res.success && res.data) setTrader(res.data);
      else setError("Trader not found");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load trader"));
    } finally {
      setLoading(false);
    }
  }, [route.params.traderId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading && !trader) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </Screen>
    );
  }

  if (!trader) {
    return (
      <Screen>
        <Text style={styles.error}>{error || "Trader not found"}</Text>
        <GradientButton label="Go back" onPress={() => navigation.goBack()} />
      </Screen>
    );
  }

  const rc =
    trader.risk === "Low"
      ? colors.profit
      : trader.risk === "Medium"
        ? colors.warn
        : colors.loss;

  const recent = trader.recentTrades || [];

  return (
    <Screen
      footer={
        <GradientButton
          label="Copy This Trader"
          onPress={() =>
            navigation.navigate("CopySetup", { traderId: trader.id })
          }
        />
      }
    >
      <View style={styles.nav}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={18} color={colors.text} />
        </Pressable>
        <Text style={styles.navTitle}>Trader Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.profileRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{trader.avatar}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{trader.name}</Text>
            {trader.verified ? (
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={colors.primary}
              />
            ) : null}
          </View>
          <Text style={styles.handle}>{trader.handle}</Text>
          <View style={styles.badgeRow}>
            {trader.verified ? (
              <View style={styles.verified}>
                <Ionicons name="checkmark" size={11} color={colors.profit} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            ) : null}
            <View style={[styles.risk, { backgroundColor: `${rc}18` }]}>
              <Text style={[styles.riskText, { color: rc }]}>
                {trader.risk} Risk
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.grid}>
        {[
          { label: "Win Rate", value: `${trader.winRate}%`, color: colors.profit },
          {
            label: "Total ROI",
            value: `+${trader.totalRoi}%`,
            color: colors.profit,
          },
          { label: "30D ROI", value: `+${trader.roi30d}%`, color: colors.profit },
          {
            label: "Copiers",
            value: String(trader.copiers),
            color: colors.text,
          },
        ].map((s) => (
          <View key={s.label} style={styles.stat}>
            <Text style={styles.statLabel}>{s.label}</Text>
            <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.bio}>{trader.bio}</Text>

      <View style={styles.tfRow}>
        {timeframes.map((t) => (
          <Pressable
            key={t}
            onPress={() => setTf(t)}
            style={[styles.tf, tf === t && styles.tfActive]}
          >
            <Text style={[styles.tfText, tf === t && styles.tfTextActive]}>
              {t}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.chartWrap}>
        <TradingChart data={trader.equity} />
      </View>
      <View style={styles.chartWrap}>
        <CandleChart
          seed={trader.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0)}
        />
      </View>

      {/* Open legs (live mark) */}
      {trader.openLegs && trader.openLegs.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Open book (live)</Text>
          {trader.openLegs.map((leg, i) => (
            <View key={`${leg.pair}-${i}`} style={styles.tradeRow}>
              <View>
                <Text style={styles.tradePair}>{leg.pair}</Text>
                <Text style={styles.tradeMeta}>
                  {leg.side.toUpperCase()} · entry{" "}
                  {leg.entry?.toLocaleString?.() ?? leg.entry}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.tradeMeta}>
                  now {leg.current?.toLocaleString?.() ?? "—"}
                </Text>
                <PnlText value={leg.pnlPct || 0} suffix="%" size="sm" />
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {recent.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent activity</Text>
          {recent.map((tr, i) => (
            <View key={`${tr.pair}-${i}`} style={styles.tradeRow}>
              <View>
                <Text style={styles.tradePair}>{tr.pair}</Text>
                <Text style={styles.tradeMeta}>
                  {tr.side} · {tr.time}
                </Text>
              </View>
              <PnlText value={tr.pnl} prefix="₹" size="sm" />
            </View>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  back: {
    height: 36,
    width: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  profileRow: { flexDirection: "row", alignItems: "center" },
  avatar: {
    height: 56,
    width: 56,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "800", color: colors.primary },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 20, fontWeight: "800", color: colors.text },
  handle: { marginTop: 2, fontSize: 13, color: colors.muted },
  badgeRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  verified: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,208,132,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  verifiedText: { fontSize: 11, fontWeight: "700", color: colors.profit },
  risk: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  riskText: { fontSize: 11, fontWeight: "700" },
  grid: {
    marginTop: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  stat: {
    width: "47%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 12,
  },
  statLabel: { fontSize: 11, color: colors.muted, fontWeight: "600" },
  statVal: { marginTop: 4, fontSize: 18, fontWeight: "800" },
  bio: {
    marginTop: 14,
    fontSize: 13,
    lineHeight: 20,
    color: colors.muted,
  },
  tfRow: {
    marginTop: 16,
    flexDirection: "row",
    gap: 8,
  },
  tf: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tfActive: {
    backgroundColor: colors.primarySoft,
    borderColor: "rgba(91,108,255,0.4)",
  },
  tfText: { fontSize: 12, fontWeight: "600", color: colors.muted },
  tfTextActive: { color: colors.primary },
  chartWrap: { marginTop: 12 },
  section: { marginTop: 18 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 10,
  },
  tradeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tradePair: { fontSize: 14, fontWeight: "700", color: colors.text },
  tradeMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  error: {
    marginTop: 40,
    textAlign: "center",
    color: colors.loss,
    marginBottom: 16,
  },
});
