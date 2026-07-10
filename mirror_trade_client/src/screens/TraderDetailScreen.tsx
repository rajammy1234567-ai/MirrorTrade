import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Screen from "../components/Screen";
import TradingChart from "../components/TradingChart";
import CandleChart from "../components/CandleChart";
import PnlText from "../components/PnlText";
import GradientButton from "../components/GradientButton";
import { recentTrades, traders } from "../data/mock";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "TraderDetail">;
const timeframes = ["7D", "30D", "90D", "All"] as const;

export default function TraderDetailScreen({ route, navigation }: Props) {
  const trader = traders.find((t) => t.id === route.params.traderId) || traders[0];
  const [tf, setTf] = useState<(typeof timeframes)[number]>("30D");
  const rc =
    trader.risk === "Low"
      ? colors.profit
      : trader.risk === "Medium"
        ? colors.warn
        : colors.loss;

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
                <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
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
            {
              label: "Max DD",
              value: `${trader.maxDrawdown}%`,
              color: colors.loss,
            },
            { label: "Avg Hold", value: trader.avgHold, color: colors.text },
            {
              label: "Copiers",
              value: trader.copiers.toLocaleString(),
              color: colors.text,
            },
            {
              label: "30D ROI",
              value: `+${trader.roi30d}%`,
              color: colors.profit,
            },
          ].map((s) => (
            <View key={s.label} style={styles.statBox}>
              <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.perfCard}>
          <Text style={styles.perfTitle}>Equity curve</Text>
          <View style={styles.chartWrap}>
            <TradingChart
              height={190}
              positive
              showVolume
              showAxis
              showRanges
              seed={Number(trader.id) * 17 + 3}
              startPrice={10000}
              color={colors.profit}
            />
          </View>
        </View>

        <View style={styles.perfCard}>
          <View style={styles.perfHead}>
            <Text style={styles.perfTitle}>Trade history</Text>
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
          </View>
          <CandleChart
            height={130}
            seed={Number(trader.id) * 31 + 9}
            start={41000 + Number(trader.id) * 800}
          />
        </View>

        <Text style={styles.section}>RECENT TRADES</Text>
        <View style={styles.trades}>
          {recentTrades.map((tr, i) => {
            const up = tr.pnl >= 0;
            return (
              <View key={`${tr.pair}-${i}`} style={styles.trade}>
                <View
                  style={[
                    styles.tradeIcon,
                    {
                      backgroundColor: up
                        ? "rgba(0,208,132,0.12)"
                        : "rgba(255,59,92,0.12)",
                    },
                  ]}
                >
                  <Ionicons
                    name={up ? "trending-up" : "trending-down"}
                    size={14}
                    color={up ? colors.profit : colors.loss}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.tradePair}>{tr.pair}</Text>
                  <Text style={styles.tradeMeta}>
                    ${tr.entry.toLocaleString()} → ${tr.exit.toLocaleString()}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <PnlText value={tr.pnl} suffix="%" size="md" />
                  <Text style={styles.tradeTime}>{tr.time}</Text>
                </View>
              </View>
            );
          })}
        </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  nav: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  navTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  profileRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    height: 60,
    width: 60,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.primary,
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  name: { fontSize: 20, fontWeight: "700", color: colors.text },
  handle: { marginTop: 2, fontSize: 13, color: colors.muted },
  badgeRow: { marginTop: 8, flexDirection: "row", gap: 6 },
  verified: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0,208,132,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedText: { fontSize: 11, fontWeight: "700", color: colors.profit },
  risk: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  riskText: { fontSize: 11, fontWeight: "700" },
  grid: {
    marginTop: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 8,
  },
  statBox: {
    width: "31.8%",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  statVal: { fontSize: 15, fontWeight: "700", textAlign: "center" },
  statLabel: {
    marginTop: 3,
    fontSize: 11,
    color: colors.muted,
    textAlign: "center",
  },
  perfCard: {
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
    overflow: "hidden",
  },
  perfHead: {
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  perfTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  tfRow: { flexDirection: "row", flexShrink: 1, gap: 2 },
  tf: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tfActive: { backgroundColor: colors.primarySoft },
  tfText: { fontSize: 11, fontWeight: "600", color: colors.muted },
  tfTextActive: { color: colors.primary },
  chartWrap: {
    width: "100%",
    alignSelf: "stretch",
  },
  section: {
    marginTop: 22,
    marginBottom: 10,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.1,
    color: colors.muted,
  },
  trades: { gap: 8 },
  trade: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 12,
  },
  tradeIcon: {
    height: 34,
    width: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tradePair: { fontSize: 14, fontWeight: "700", color: colors.text },
  tradeMeta: { marginTop: 2, fontSize: 11, color: colors.muted },
  tradeTime: { marginTop: 2, fontSize: 11, color: colors.muted },
});
