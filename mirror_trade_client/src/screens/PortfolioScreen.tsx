import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import Screen from "../components/Screen";
import PnlText from "../components/PnlText";
import EmptyState from "../components/EmptyState";
import { portfolio } from "../data/mock";
import { useAppData } from "../context/AppDataContext";
import { colors } from "../theme/colors";

export default function PortfolioScreen() {
  const { positions, history, closePosition, settings } = useAppData();
  const [tab, setTab] = useState<"active" | "history">("active");
  const list = tab === "active" ? positions : history;

  const onClose = (id: string, pair: string) => {
    if (settings.confirmOrders) {
      Alert.alert("Close position", `Close ${pair} at market?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Close",
          style: "destructive",
          onPress: () => closePosition(id),
        },
      ]);
    } else {
      closePosition(id);
    }
  };

  return (
    <Screen tabScreen>
      <Text style={styles.title}>Portfolio</Text>

      <View style={styles.summary}>
        <View style={styles.summaryTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sumLabel}>ALL-TIME PnL</Text>
            <PnlText value={portfolio.allTimePnl} prefix="₹" size="xl" />
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.sumLabel}>OPEN POSITIONS</Text>
            <Text style={styles.openCount}>{positions.length}</Text>
          </View>
        </View>
        <View style={styles.wlRow}>
          <View style={styles.wlItem}>
            <Text style={[styles.wlVal, { color: colors.profit }]}>
              {portfolio.wins}
            </Text>
            <Text style={styles.wlLabel}>Wins</Text>
          </View>
          <View style={styles.wlItem}>
            <Text style={[styles.wlVal, { color: colors.loss }]}>
              {portfolio.losses}
            </Text>
            <Text style={styles.wlLabel}>Losses</Text>
          </View>
          <View style={styles.wlItem}>
            <Text style={styles.wlVal}>{portfolio.winRate}%</Text>
            <Text style={styles.wlLabel}>Win Rate</Text>
          </View>
        </View>
      </View>

      <View style={styles.tabs}>
        <Pressable
          onPress={() => setTab("active")}
          style={[styles.tab, tab === "active" && styles.tabActive]}
        >
          <Text style={[styles.tabText, tab === "active" && styles.tabTextActive]}>
            Active ({positions.length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab("history")}
          style={[styles.tab, tab === "history" && styles.tabActive]}
        >
          <Text
            style={[styles.tabText, tab === "history" && styles.tabTextActive]}
          >
            History ({history.length})
          </Text>
        </Pressable>
      </View>

      <View style={styles.list}>
        {list.length === 0 ? (
          <EmptyState
            icon="briefcase-outline"
            title={tab === "active" ? "No open positions" : "No history yet"}
            subtitle={
              tab === "active"
                ? "Copy a trader, run a bot, or execute a signal"
                : "Closed trades will appear here"
            }
          />
        ) : (
          list.map((p) => (
            <View key={p.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View>
                  <Text style={styles.pair}>{p.pair}</Text>
                  <Text style={styles.source}>{p.source}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <PnlText value={p.pnlPct} suffix="%" size="md" />
                  <PnlText value={p.pnl} prefix="₹" size="sm" bold={false} />
                </View>
              </View>

              <View style={styles.priceRow}>
                <View>
                  <Text style={styles.priceLabel}>ENTRY</Text>
                  <Text style={styles.priceVal}>
                    ₹{p.entry.toLocaleString("en-IN")}
                  </Text>
                </View>
                <View>
                  <Text style={styles.priceLabel}>
                    {tab === "active" ? "CURRENT" : "EXIT"}
                  </Text>
                  <Text style={styles.priceVal}>
                    ₹{p.current.toLocaleString("en-IN")}
                  </Text>
                </View>
                {tab === "history" && p.closedDate ? (
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.priceLabel}>DATE</Text>
                    <Text style={styles.priceVal}>{p.closedDate}</Text>
                  </View>
                ) : (
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.priceLabel}>SIDE</Text>
                    <Text
                      style={[
                        styles.priceVal,
                        {
                          color:
                            p.side === "long" ? colors.profit : colors.loss,
                        },
                      ]}
                    >
                      {p.side.toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              {tab === "active" ? (
                <Pressable
                  onPress={() => onClose(p.id, p.pair)}
                  style={styles.closeBtn}
                >
                  <Text style={styles.closeText}>Close Position</Text>
                </Pressable>
              ) : null}
            </View>
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: 4,
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
  },
  summary: {
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
  },
  summaryTop: { flexDirection: "row", justifyContent: "space-between" },
  sumLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: colors.muted,
    marginBottom: 6,
  },
  openCount: { fontSize: 28, fontWeight: "700", color: colors.text },
  wlRow: {
    marginTop: 16,
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 14,
  },
  wlItem: { flex: 1, alignItems: "center" },
  wlVal: { fontSize: 18, fontWeight: "700", color: colors.text },
  wlLabel: { marginTop: 3, fontSize: 12, color: colors.muted },
  tabs: {
    marginTop: 16,
    flexDirection: "row",
    borderRadius: 14,
    backgroundColor: colors.elevated,
    padding: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    borderRadius: 12,
    paddingVertical: 10,
  },
  tabActive: { backgroundColor: colors.card },
  tabText: { fontSize: 13, fontWeight: "600", color: colors.muted },
  tabTextActive: { color: colors.text },
  list: { marginTop: 14, gap: 12 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between" },
  pair: { fontSize: 16, fontWeight: "700", color: colors.text },
  source: { marginTop: 3, fontSize: 12, color: colors.muted },
  priceRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: colors.muted,
  },
  priceVal: {
    marginTop: 3,
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  closeBtn: {
    marginTop: 14,
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,59,92,0.35)",
    backgroundColor: "rgba(255,59,92,0.08)",
    paddingVertical: 11,
  },
  closeText: { fontSize: 13, fontWeight: "700", color: colors.loss },
});
