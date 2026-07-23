import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Screen from "../components/Screen";
import Sparkline from "../components/Sparkline";
import PnlText from "../components/PnlText";
import GradientButton from "../components/GradientButton";
import {
  getApiErrorMessage,
  listTradersRequest,
  type ApiTrader,
} from "../config/api";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

const filters = ["Top ROI", "Most Followers", "Low Risk", "New"] as const;

function formatFollowers(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function riskColor(risk: string) {
  if (risk === "Low") return colors.profit;
  if (risk === "Medium") return colors.warn;
  return colors.loss;
}

function sortKey(filter: (typeof filters)[number]) {
  if (filter === "Most Followers") return "followers";
  if (filter === "New") return "new";
  return "roi";
}

export default function DiscoverScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("Top ROI");
  const [traders, setTraders] = useState<ApiTrader[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const res = await listTradersRequest({
        sort: sortKey(filter),
        ...(filter === "Low Risk" ? { risk: "Low" } : {}),
      });
      if (res.success) setTraders(res.data || []);
      else setError("Could not load traders");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load traders"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const list = useMemo(() => {
    let data = [...traders];
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      data = data.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.handle.toLowerCase().includes(q)
      );
    }
    return data;
  }, [traders, query]);

  return (
    <Screen tabScreen>
      <Text style={styles.title}>Discover Traders</Text>

      <View style={styles.search}>
        <Ionicons name="search-outline" size={18} color={colors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search traders, strategies..."
          placeholderTextColor="#6B7289"
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
        style={styles.filterScroll}
      >
        {filters.map((f) => {
          const active = filter === f;
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {f}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.signalBanner}>
        <View style={styles.signalIcon}>
          <Ionicons name="radio" size={16} color={colors.warn} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.signalTitle}>Live copy market</Text>
          <Text style={styles.signalSub}>
            Prices marked to Binance · start copy with one tap
          </Text>
        </View>
      </View>

      {loading && !traders.length ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
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

          {list.length === 0 && !error ? (
            <Text style={styles.empty}>No traders match your search</Text>
          ) : null}

          {list.map((t) => {
            const rc = riskColor(t.risk);
            return (
              <Pressable
                key={t.id}
                style={styles.card}
                onPress={() =>
                  navigation.navigate("TraderDetail", { traderId: t.id })
                }
              >
                <View style={styles.cardTop}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{t.avatar}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.name}>{t.name}</Text>
                      {t.verified ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={14}
                          color={colors.primary}
                        />
                      ) : null}
                    </View>
                    <Text style={styles.handle}>{t.handle}</Text>
                    <View style={[styles.risk, { backgroundColor: `${rc}18` }]}>
                      <Text style={[styles.riskText, { color: rc }]}>
                        {t.risk} Risk
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <PnlText value={t.roi30d} suffix="% ROI" size="md" />
                    <Text style={styles.meta}>
                      {formatFollowers(t.followers)} · {t.copiers} copiers
                    </Text>
                  </View>
                </View>
                {t.equity?.length ? (
                  <View style={{ marginTop: 10 }}>
                    <Sparkline data={t.equity} height={36} />
                  </View>
                ) : null}
                <View style={styles.cardFooter}>
                  <Text style={styles.win}>Win {t.winRate}%</Text>
                  <GradientButton
                    size="sm"
                    label="Copy"
                    onPress={() =>
                      navigation.navigate("CopySetup", { traderId: t.id })
                    }
                  />
                </View>
              </Pressable>
            );
          })}
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
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    padding: 0,
  },
  filterScroll: { marginTop: 12, maxHeight: 40 },
  filters: { gap: 8, paddingRight: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: "rgba(91,108,255,0.4)",
  },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.muted },
  chipTextActive: { color: colors.primary },
  signalBanner: {
    marginTop: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(245,165,36,0.25)",
    backgroundColor: "rgba(245,165,36,0.08)",
    padding: 12,
  },
  signalIcon: {
    height: 32,
    width: 32,
    borderRadius: 10,
    backgroundColor: "rgba(245,165,36,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  signalTitle: { fontSize: 13, fontWeight: "700", color: colors.text },
  signalSub: { fontSize: 11, color: colors.muted, marginTop: 2 },
  card: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start" },
  avatar: {
    height: 44,
    width: 44,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 14, fontWeight: "800", color: colors.primary },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  name: { fontSize: 15, fontWeight: "700", color: colors.text },
  handle: { fontSize: 12, color: colors.muted, marginTop: 2 },
  risk: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  riskText: { fontSize: 10, fontWeight: "700" },
  meta: { marginTop: 4, fontSize: 11, color: colors.muted },
  cardFooter: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  win: { fontSize: 12, fontWeight: "600", color: colors.profit },
  errorBox: {
    marginTop: 16,
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
  empty: {
    marginTop: 32,
    textAlign: "center",
    color: colors.muted,
    fontSize: 14,
  },
});
