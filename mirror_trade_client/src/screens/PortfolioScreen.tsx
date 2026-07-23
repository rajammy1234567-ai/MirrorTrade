import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Screen from "../components/Screen";
import PnlText from "../components/PnlText";
import EmptyState from "../components/EmptyState";
import GradientButton from "../components/GradientButton";
import {
  closePositionRequest,
  getApiErrorMessage,
  getMyPositionsRequest,
  getPortfolioSummaryRequest,
  type ApiCopyPosition,
  type PortfolioSummary,
} from "../config/api";
import { useAuth } from "../context/AuthContext";
import { useAppData } from "../context/AppDataContext";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

export default function PortfolioScreen() {
  const { user } = useAuth();
  const { settings } = useAppData();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [tab, setTab] = useState<"active" | "history">("active");
  const [active, setActive] = useState<ApiCopyPosition[]>([]);
  const [history, setHistory] = useState<ApiCopyPosition[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [closingId, setClosingId] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!user) {
        setActive([]);
        setHistory([]);
        setSummary(null);
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      try {
        const [sumRes, actRes, histRes] = await Promise.all([
          getPortfolioSummaryRequest(),
          getMyPositionsRequest("active"),
          getMyPositionsRequest("closed"),
        ]);
        if (sumRes.success) setSummary(sumRes.data);
        if (actRes.success) setActive(actRes.data || []);
        if (histRes.success) setHistory(histRes.data || []);
      } catch (err) {
        setError(getApiErrorMessage(err, "Failed to load portfolio"));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const list = tab === "active" ? active : history;

  const doClose = async (id: string) => {
    setClosingId(id);
    try {
      await closePositionRequest(id);
      await load(true);
    } catch (err) {
      Alert.alert("Close failed", getApiErrorMessage(err));
    } finally {
      setClosingId(null);
    }
  };

  const onClose = (id: string, pair: string) => {
    if (settings.confirmOrders) {
      Alert.alert("Close position", `Close ${pair} at market mark?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Close",
          style: "destructive",
          onPress: () => doClose(id),
        },
      ]);
    } else {
      doClose(id);
    }
  };

  if (!user) {
    return (
      <Screen tabScreen>
        <Text style={styles.title}>Portfolio</Text>
        <EmptyState
          icon="lock-closed-outline"
          title="Login required"
          subtitle="Sign in to see your copy positions"
        />
        <GradientButton
          label="Login"
          onPress={() => navigation.navigate("Auth")}
        />
      </Screen>
    );
  }

  return (
    <Screen tabScreen>
      <Text style={styles.title}>Portfolio</Text>

      {loading && !summary ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={colors.primary}
            />
          }
        >
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable onPress={() => load()}>
                <Text style={styles.retry}>Retry</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.summary}>
            <View style={styles.summaryTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sumLabel}>ALL-TIME PnL</Text>
                <PnlText
                  value={summary?.allTimePnl ?? 0}
                  prefix="₹"
                  size="xl"
                />
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.sumLabel}>OPEN POSITIONS</Text>
                <Text style={styles.openCount}>
                  {summary?.openPositions ?? active.length}
                </Text>
              </View>
            </View>
            <View style={styles.wlRow}>
              <View style={styles.wlItem}>
                <Text style={[styles.wlVal, { color: colors.profit }]}>
                  {summary?.wins ?? 0}
                </Text>
                <Text style={styles.wlLabel}>Wins</Text>
              </View>
              <View style={styles.wlItem}>
                <Text style={[styles.wlVal, { color: colors.loss }]}>
                  {summary?.losses ?? 0}
                </Text>
                <Text style={styles.wlLabel}>Losses</Text>
              </View>
              <View style={styles.wlItem}>
                <Text style={styles.wlVal}>{summary?.winRate ?? 0}%</Text>
                <Text style={styles.wlLabel}>Win Rate</Text>
              </View>
            </View>
            {summary ? (
              <Text style={styles.alloc}>
                Allocated ₹{summary.allocated.toLocaleString("en-IN")} ·{" "}
                {summary.activeCopies} active copies · Unrealized{" "}
                <Text
                  style={{
                    color:
                      summary.unrealizedPnl >= 0 ? colors.profit : colors.loss,
                  }}
                >
                  ₹{summary.unrealizedPnl.toFixed(2)}
                </Text>
              </Text>
            ) : null}
          </View>

          <View style={styles.tabs}>
            <Pressable
              onPress={() => setTab("active")}
              style={[styles.tab, tab === "active" && styles.tabActive]}
            >
              <Text
                style={[
                  styles.tabText,
                  tab === "active" && styles.tabTextActive,
                ]}
              >
                Active ({active.length})
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setTab("history")}
              style={[styles.tab, tab === "history" && styles.tabActive]}
            >
              <Text
                style={[
                  styles.tabText,
                  tab === "history" && styles.tabTextActive,
                ]}
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
                    ? "Discover a trader and tap Copy This Trader"
                    : "Closed trades will appear here"
                }
              />
            ) : (
              list.map((p) => (
                <View key={p.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View>
                      <Text style={styles.pair}>{p.pair}</Text>
                      <Text style={styles.source}>
                        {p.source} · {p.side.toUpperCase()}
                      </Text>
                    </View>
                    <PnlText value={p.pnl} prefix="₹" size="md" />
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.meta}>
                      Entry {Number(p.entry).toLocaleString()}
                    </Text>
                    <Text style={styles.meta}>
                      Mark {Number(p.current).toLocaleString()}
                    </Text>
                    <PnlText value={p.pnlPct} suffix="%" size="sm" />
                  </View>
                  {tab === "active" ? (
                    <Pressable
                      style={styles.closeBtn}
                      onPress={() => onClose(p.id, p.pair)}
                      disabled={closingId === p.id}
                    >
                      <Text style={styles.closeText}>
                        {closingId === p.id ? "Closing…" : "Close"}
                      </Text>
                    </Pressable>
                  ) : p.closeReason ? (
                    <Text style={styles.closedReason}>
                      Closed · {p.closeReason.replace(/_/g, " ")}
                    </Text>
                  ) : null}
                </View>
              ))
            )}
          </View>

          {tab === "active" && list.length === 0 ? (
            <View style={{ marginTop: 8, marginBottom: 24 }}>
              <GradientButton
                label="Discover Traders"
                onPress={() => {
                  const parent = navigation.getParent?.() as
                    | { navigate: (a: string, b?: object) => void }
                    | undefined;
                  if (parent?.navigate) {
                    parent.navigate("MainTabs", { screen: "Discover" });
                  } else {
                    navigation.navigate("MainTabs");
                  }
                }}
              />
            </View>
          ) : (
            <View style={{ height: 24 }} />
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 14,
  },
  summary: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
  },
  summaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sumLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: colors.muted,
    marginBottom: 4,
  },
  openCount: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
  },
  wlRow: {
    marginTop: 16,
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 14,
  },
  wlItem: { flex: 1, alignItems: "center" },
  wlVal: { fontSize: 18, fontWeight: "800", color: colors.text },
  wlLabel: { marginTop: 2, fontSize: 11, color: colors.muted },
  alloc: {
    marginTop: 12,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 17,
  },
  tabs: {
    marginTop: 16,
    flexDirection: "row",
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  tabActive: { backgroundColor: colors.primarySoft },
  tabText: { fontSize: 13, fontWeight: "600", color: colors.muted },
  tabTextActive: { color: colors.primary, fontWeight: "700" },
  list: { marginTop: 12 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  pair: { fontSize: 16, fontWeight: "800", color: colors.text },
  source: { marginTop: 3, fontSize: 12, color: colors.muted },
  metaRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  meta: { fontSize: 12, color: colors.muted },
  closeBtn: {
    marginTop: 12,
    alignSelf: "flex-end",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,59,92,0.12)",
  },
  closeText: { color: colors.loss, fontWeight: "700", fontSize: 13 },
  closedReason: {
    marginTop: 8,
    fontSize: 11,
    color: colors.muted,
    textTransform: "capitalize",
  },
  errorBox: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,59,92,0.3)",
    backgroundColor: "rgba(255,59,92,0.08)",
  },
  errorText: { color: colors.loss, fontSize: 13 },
  retry: {
    marginTop: 8,
    color: colors.primary,
    fontWeight: "700",
    fontSize: 13,
  },
});
