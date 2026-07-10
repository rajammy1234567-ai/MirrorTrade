import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Screen from "../components/Screen";
import GradientButton from "../components/GradientButton";
import PnlText from "../components/PnlText";
import TradingChart from "../components/TradingChart";
import { useAppData } from "../context/AppDataContext";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "BotDetail">;

export default function BotDetailScreen({ route, navigation }: Props) {
  const { bots, pauseBot, stopBot } = useAppData();
  const bot = bots.find((b) => b.id === route.params.botId);

  if (!bot) {
    return (
      <Screen>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={18} color={colors.text} />
        </Pressable>
        <Text style={styles.missing}>Bot not found or already stopped.</Text>
        <GradientButton label="Back to Bots" onPress={() => navigation.goBack()} />
      </Screen>
    );
  }

  const accent = bot.type === "Grid" ? colors.primary : colors.profit;

  return (
    <Screen
      footer={
        <View style={styles.footerRow}>
          <View style={{ flex: 1 }}>
            <GradientButton
              label={bot.running ? "Pause Bot" : "Resume Bot"}
              variant="ghost"
              onPress={() => pauseBot(bot.id)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <GradientButton
              label="Stop Bot"
              variant="danger"
              onPress={() => {
                Alert.alert("Stop bot", `Stop ${bot.name}?`, [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Stop",
                    style: "destructive",
                    onPress: () => {
                      stopBot(bot.id);
                      navigation.goBack();
                    },
                  },
                ]);
              }}
            />
          </View>
        </View>
      }
    >
      <View style={styles.nav}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={18} color={colors.text} />
        </Pressable>
        <Text style={styles.navTitle}>Bot Details</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.hero}>
        <View style={[styles.icon, { backgroundColor: `${accent}22` }]}>
          <Ionicons
            name={bot.type === "Grid" ? "layers-outline" : "trending-up"}
            size={24}
            color={accent}
          />
        </View>
        <Text style={styles.name}>{bot.name}</Text>
        <Text style={styles.meta}>
          {bot.type} · {bot.pair} · {bot.runtime}
        </Text>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: bot.running
                ? "rgba(0,208,132,0.12)"
                : "rgba(139,147,167,0.15)",
            },
          ]}
        >
          <Text
            style={{
              color: bot.running ? colors.profit : colors.muted,
              fontWeight: "700",
              fontSize: 12,
            }}
          >
            {bot.running ? "RUNNING" : "PAUSED"}
          </Text>
        </View>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Investment</Text>
          <Text style={styles.statVal}>
            ${bot.investment.toLocaleString()}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>PnL</Text>
          <PnlText value={bot.pnl} prefix="$" size="lg" />
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Return</Text>
          <PnlText value={bot.pnlPct} suffix="%" size="lg" />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Performance</Text>
        <TradingChart
          height={160}
          positive={bot.pnl >= 0}
          showVolume={false}
          showAxis
          showRanges
          seed={bot.id.length * 11}
          startPrice={bot.investment}
          color={accent}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Configuration</Text>
        <Row label="Strategy" value={bot.type === "Grid" ? "Grid trading" : "DCA schedule"} />
        <Row label="Pair" value={bot.pair} />
        <Row label="Runtime" value={bot.runtime} />
        <Row label="Status" value={bot.running ? "Live" : "Paused"} />
      </View>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowVal}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
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
  missing: {
    marginVertical: 24,
    textAlign: "center",
    color: colors.muted,
  },
  hero: { alignItems: "center", marginTop: 12, marginBottom: 18 },
  icon: {
    height: 56,
    width: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    marginTop: 12,
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
  },
  meta: { marginTop: 4, fontSize: 13, color: colors.muted },
  badge: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stats: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  stat: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 12,
    alignItems: "center",
  },
  statLabel: { fontSize: 11, color: colors.muted, marginBottom: 4 },
  statVal: { fontSize: 16, fontWeight: "700", color: colors.text },
  card: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowLabel: { fontSize: 13, color: colors.muted },
  rowVal: { fontSize: 13, fontWeight: "600", color: colors.text },
  footerRow: { flexDirection: "row", gap: 10 },
});
