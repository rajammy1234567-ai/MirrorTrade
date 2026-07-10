import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Screen from "../components/Screen";
import Sparkline from "../components/Sparkline";
import PnlText from "../components/PnlText";
import GradientButton from "../components/GradientButton";
import { traders } from "../data/mock";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

const filters = ["Top ROI", "Most Followers", "Low Risk", "New"];

function formatFollowers(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function riskColor(risk: string) {
  if (risk === "Low") return colors.profit;
  if (risk === "Medium") return colors.warn;
  return colors.loss;
}

export default function DiscoverScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Top ROI");

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
    if (filter === "Top ROI") data.sort((a, b) => b.roi30d - a.roi30d);
    if (filter === "Most Followers")
      data.sort((a, b) => b.followers - a.followers);
    if (filter === "Low Risk") data = data.filter((t) => t.risk === "Low");
    if (filter === "New") data = data.slice().reverse();
    return data;
  }, [query, filter]);

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

      {/* Live signal banner */}
      <View style={styles.signalBanner}>
        <View style={styles.signalIcon}>
          <Ionicons name="radio" size={16} color={colors.warn} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.signalTitle}>Live Signal Feed</Text>
          <Text style={styles.signalSub}>4 new signals in the past hour</Text>
        </View>
      </View>

      <View style={styles.list}>
        {list.map((t) => {
          const rc = riskColor(t.risk);
          return (
            <View key={t.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{t.avatar}</Text>
                </View>
                <View style={styles.meta}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name}>{t.name}</Text>
                    {t.verified ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={15}
                        color={colors.primary}
                      />
                    ) : null}
                  </View>
                  <Text style={styles.handle}>{t.handle}</Text>
                  <View style={[styles.riskPill, { backgroundColor: `${rc}18` }]}>
                    <Text style={[styles.riskText, { color: rc }]}>
                      {t.risk} Risk
                    </Text>
                  </View>
                </View>
                <View style={styles.miniChart}>
                  <Sparkline
                    width={88}
                    height={42}
                    positive={t.roi30d >= 0}
                    fill
                    showEndDot
                    strokeWidth={2}
                    seed={Number(t.id) * 13 + 5}
                    color={t.roi30d >= 0 ? colors.profit : colors.warn}
                  />
                </View>
              </View>

              <View style={styles.stats}>
                <View style={styles.stat}>
                  <PnlText value={t.roi30d} suffix="%" size="md" />
                  <Text style={styles.statLabel}>30D ROI</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{t.winRate}%</Text>
                  <Text style={styles.statLabel}>Win Rate</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>
                    {formatFollowers(t.followers)}
                  </Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </View>
              </View>

              <View style={styles.actions}>
                <View style={{ flex: 1 }}>
                  <GradientButton
                    label="View Profile"
                    variant="ghost"
                    size="sm"
                    onPress={() =>
                      navigation.navigate("TraderDetail", { traderId: t.id })
                    }
                  />
                </View>
                <View style={{ flex: 1.2 }}>
                  <GradientButton
                    label="Copy Trader"
                    size="sm"
                    onPress={() =>
                      navigation.navigate("CopySetup", { traderId: t.id })
                    }
                  />
                </View>
              </View>
            </View>
          );
        })}
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
  search: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    paddingVertical: 13,
    fontSize: 14,
    color: colors.text,
  },
  filterScroll: { marginTop: 14, maxHeight: 40 },
  filters: { gap: 8, paddingRight: 8 },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  signalBanner: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245,165,36,0.35)",
    backgroundColor: "rgba(245,165,36,0.08)",
    padding: 14,
  },
  signalIcon: {
    height: 36,
    width: 36,
    borderRadius: 10,
    backgroundColor: "rgba(245,165,36,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  signalTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  signalSub: {
    marginTop: 2,
    fontSize: 12,
    color: colors.muted,
  },
  list: { marginTop: 16, gap: 14 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    height: 48,
    width: 48,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primary,
  },
  meta: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  handle: {
    marginTop: 2,
    fontSize: 12,
    color: colors.muted,
  },
  riskPill: {
    alignSelf: "flex-start",
    marginTop: 6,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  riskText: {
    fontSize: 11,
    fontWeight: "700",
  },
  miniChart: {
    width: 80,
    height: 40,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  stats: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: colors.elevated,
    paddingVertical: 12,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  statLabel: {
    marginTop: 3,
    fontSize: 11,
    color: colors.muted,
    textAlign: "center",
  },
  actions: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 10,
  },
});
