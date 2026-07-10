import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Screen from "../components/Screen";
import TradingChart from "../components/TradingChart";
import PnlText from "../components/PnlText";
import SectionHeader from "../components/SectionHeader";
import { portfolio } from "../data/mock";
import { useAppData } from "../context/AppDataContext";
import { useAuth } from "../context/AuthContext";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

const actions = [
  {
    key: "copy",
    label: "Copy Trader",
    icon: "copy-outline" as const,
    tab: "Discover" as const,
  },
  {
    key: "bots",
    label: "Run Bot",
    icon: "hardware-chip-outline" as const,
    tab: "Trade" as const,
  },
  {
    key: "signals",
    label: "Signals",
    icon: "radio-outline" as const,
    route: "Signals" as const,
  },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning,";
  if (h < 17) return "Good afternoon,";
  return "Good evening,";
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { positions, unreadCount } = useAppData();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const tabNav = useNavigation<any>();
  const name = user?.name || "Trader";

  const openPnl = positions.reduce((s, p) => s + p.pnl, 0);

  return (
    <Screen tabScreen>
      <View style={styles.header}>
        <View>
          <Text style={styles.greet}>{greeting()}</Text>
          <Text style={styles.name}>
            {name} <Text style={styles.wave}>👋</Text>
          </Text>
        </View>
        <Pressable
          style={styles.bell}
          onPress={() => navigation.navigate("Notifications")}
        >
          <Ionicons name="notifications-outline" size={18} color={colors.text} />
          {unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <View style={styles.portfolioCard}>
        <Text style={styles.cardLabel}>Total Portfolio Value</Text>
        <Text style={styles.portfolioValue}>
          $
          {portfolio.totalValue.toLocaleString(undefined, {
            minimumFractionDigits: 2,
          })}
        </Text>
        <View style={styles.pnlRow}>
          <View style={styles.pnlChip}>
            <Ionicons name="arrow-up" size={12} color={colors.profit} />
            <PnlText value={portfolio.todayPnl} prefix="$" size="sm" />
          </View>
          <View style={styles.pnlChip}>
            <PnlText value={portfolio.todayPnlPct} suffix="%" size="sm" />
            <Text style={styles.today}>today</Text>
          </View>
          <View style={styles.pnlChipMuted}>
            <Text style={styles.mutedChip}>
              Open PnL{" "}
              <Text style={{ color: openPnl >= 0 ? colors.profit : colors.loss }}>
                {openPnl >= 0 ? "+" : ""}${openPnl.toFixed(0)}
              </Text>
            </Text>
          </View>
        </View>
        <View style={styles.chartWrap}>
          <TradingChart
            height={200}
            positive
            showVolume
            showAxis
            showRanges
            seed={portfolio.chartSeed}
            startPrice={portfolio.chartStart}
            color={colors.profit}
            labels={portfolio.chartLabels}
          />
        </View>
      </View>

      <SectionHeader title="Quick Actions" />
      <View style={styles.actions}>
        {actions.map((a) => (
          <Pressable
            key={a.key}
            onPress={() => {
              if (a.route) navigation.navigate(a.route);
              else if (a.tab) tabNav.navigate(a.tab);
            }}
            style={styles.actionCard}
          >
            <View style={styles.actionIcon}>
              <Ionicons name={a.icon} size={20} color={colors.primary} />
            </View>
            <Text style={styles.actionLabel}>{a.label}</Text>
          </Pressable>
        ))}
      </View>

      <SectionHeader
        title="Active Positions"
        actionLabel="View all"
        onAction={() => tabNav.navigate("Portfolio")}
      />

      <View style={styles.list}>
        {positions.length === 0 ? (
          <View style={styles.emptyPos}>
            <Text style={styles.emptyPosText}>
              No open positions — copy a trader or run a bot
            </Text>
          </View>
        ) : (
          positions.map((p) => {
            const up = p.pnlPct >= 0;
            return (
              <View key={p.id} style={styles.posCard}>
                <View
                  style={[
                    styles.sideIcon,
                    {
                      backgroundColor: up
                        ? "rgba(0,208,132,0.12)"
                        : "rgba(255,59,92,0.12)",
                    },
                  ]}
                >
                  <Ionicons
                    name={up ? "trending-up" : "trending-down"}
                    size={16}
                    color={up ? colors.profit : colors.loss}
                  />
                </View>
                <View style={styles.posMid}>
                  <Text style={styles.pair}>{p.pair}</Text>
                  <Text style={styles.source}>{p.source}</Text>
                </View>
                <View style={styles.posRight}>
                  <PnlText value={p.pnlPct} suffix="%" size="md" />
                  <PnlText value={p.pnl} prefix="$" size="sm" bold={false} />
                </View>
              </View>
            );
          })
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greet: { fontSize: 13, color: colors.muted },
  name: {
    marginTop: 2,
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
  },
  wave: { fontSize: 20 },
  bell: {
    height: 42,
    width: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.loss,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  portfolioCard: {
    marginTop: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingTop: 18,
    paddingHorizontal: 14,
    paddingBottom: 14,
    overflow: "hidden",
  },
  cardLabel: { fontSize: 12, color: colors.muted, fontWeight: "500" },
  portfolioValue: {
    marginTop: 8,
    fontSize: 32,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.5,
  },
  pnlRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  pnlChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,208,132,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pnlChipMuted: {
    backgroundColor: colors.elevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mutedChip: { fontSize: 12, color: colors.muted },
  today: { fontSize: 12, color: colors.muted, marginLeft: 2 },
  chartWrap: { marginTop: 12, width: "100%", alignSelf: "stretch" },
  actions: { flexDirection: "row", alignItems: "stretch", gap: 10 },
  actionCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  actionIcon: {
    height: 44,
    width: 44,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
  },
  list: { gap: 10 },
  emptyPos: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
  },
  emptyPosText: { textAlign: "center", color: colors.muted, fontSize: 13 },
  posCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  sideIcon: {
    height: 40,
    width: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  posMid: { flex: 1, marginLeft: 12, marginRight: 10, minWidth: 0 },
  pair: { fontSize: 15, fontWeight: "700", color: colors.text },
  source: { marginTop: 2, fontSize: 12, color: colors.muted },
  posRight: { alignItems: "flex-end", minWidth: 72 },
});
