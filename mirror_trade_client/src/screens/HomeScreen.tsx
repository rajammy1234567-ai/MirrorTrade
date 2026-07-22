import React, { useState, useEffect, useCallback } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
} from "react-native";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../context/AuthContext";
import { RootStackParamList } from "../navigation/types";
import { traders } from "../data/mock";
import { colors } from "../theme/colors";

const gridActions = [
  { label: "VIP Plans", icon: "crown" as const, route: "TeamRank", tint: colors.primary },
  { label: "Reward Hub", icon: "gift" as const, route: "Referral", tint: colors.warn },
  { label: "Profit", icon: "chart-line" as const, tab: "Portfolio", tint: colors.profit },
  { label: "Invest Control", icon: "shield-alt" as const, route: "Security", tint: "#8B5CF6" },
  { label: "API Connect", icon: "plug" as const, route: "ExchangeConnect", tint: colors.primary },
  { label: "Invite Friends", icon: "user-plus" as const, route: "Referral", tint: colors.profit },
  { label: "Coaches", icon: "user-tie" as const, tab: "Discover", tint: colors.warn },
  { label: "More", icon: "th-large" as const, route: "TradingPrefs", tint: colors.muted },
];

const RANK_MEDAL = ["#5B6CFF", "#8B5CF6", "#00D084"] as const;

export default function HomeScreen() {
  const { user, refreshUser } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const tabNav = useNavigation<any>();

  const [activeMainTab, setActiveMainTab] = useState("Profit");
  const [activeSubTab, setActiveSubTab] = useState("Automated");
  const [activeFilter, setActiveFilter] = useState("90 Days");
  const [timeLeft, setTimeLeft] = useState({ h: 14, m: 21, s: 39 });

  useFocusEffect(
    useCallback(() => {
      refreshUser().catch(() => undefined);
    }, [refreshUser])
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { h, m, s } = prev;
        if (s > 0) s--;
        else {
          s = 59;
          if (m > 0) m--;
          else {
            m = 59;
            h = h > 0 ? h - 1 : 23;
          }
        }
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const pad = (n: number) => n.toString().padStart(2, "0");

  const topTraders = traders.slice(0, 3).map((t, index) => ({
    ...t,
    rank: index + 1,
    earning: (t.roi30d * 125).toLocaleString(undefined, {
      minimumFractionDigits: 2,
    }),
    vip: `T-VIP${6 - index}`,
    flag: ["🇷🇼", "🇮🇩", "🇺🇸"][index % 3],
    avatarImg: `https://i.pravatar.cc/100?u=${t.id}`,
  }));

  const handleAction = (item: (typeof gridActions)[number]) => {
    if ("route" in item && item.route) navigation.navigate(item.route as any);
    else if ("tab" in item && item.tab) tabNav.navigate(item.tab);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* TOP NAV */}
        <View style={styles.topNav}>
          <Pressable
            style={styles.profileIconWrap}
            onPress={() => tabNav.navigate("Profile")}
          >
            <Ionicons name="person" size={18} color={colors.text} />
          </Pressable>
          <View style={styles.topNavRight}>
            <Pressable style={styles.navIcon}>
              <Ionicons name="paper-plane-outline" size={22} color={colors.text} />
            </Pressable>
            <Pressable style={styles.navIcon}>
              <Ionicons name="time-outline" size={24} color={colors.text} />
            </Pressable>
            <Pressable
              style={styles.navIcon}
              onPress={() => navigation.navigate("Notifications")}
            >
              <Ionicons name="notifications-outline" size={24} color={colors.text} />
            </Pressable>
          </View>
        </View>

        {/* INVITE BANNER */}
        <Pressable onPress={() => navigation.navigate("Referral")}>
          <LinearGradient
            colors={["rgba(91,108,255,0.22)", "rgba(139,92,246,0.12)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.inviteBanner}
          >
            <View style={styles.inviteLeft}>
              <View style={styles.giftIconWrap}>
                <Ionicons name="gift" size={22} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.inviteText}>Invite 3 Direct Members</Text>
                <Text style={styles.inviteBonus}>+₹10</Text>
              </View>
            </View>
            <View style={styles.inviteBtn}>
              <Text style={styles.inviteBtnText}>Invite Now</Text>
            </View>
          </LinearGradient>
        </Pressable>

        {/* VIP CARDS */}
        <View style={styles.vipRow}>
          <Pressable
            style={{ flex: 1 }}
            onPress={() => navigation.navigate("TeamRank", { focus: "C-VIP" })}
          >
            <LinearGradient
              colors={[colors.primaryEnd, "#6D28D9"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.vipCard}
            >
              <MaterialCommunityIcons
                name="crown"
                size={20}
                color="#fff"
                style={styles.vipIcon}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.vipText}>C-VIP</Text>
                <Text style={styles.vipSub} numberOfLines={1}>
                  {user?.cVipRank && user.cVipRank !== "NONE"
                    ? user.cVipRank
                    : "Team rank"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </Pressable>
          <Pressable
            style={{ flex: 1 }}
            onPress={() => navigation.navigate("TeamRank", { focus: "T-VIP" })}
          >
            <LinearGradient
              colors={[colors.primary, "#4338CA"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.vipCard}
            >
              <MaterialCommunityIcons
                name="diamond-stone"
                size={20}
                color="#fff"
                style={styles.vipIcon}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.vipText}>T-VIP</Text>
                <Text style={styles.vipSub} numberOfLines={1}>
                  {user?.tVipRank && user.tVipRank !== "NONE"
                    ? user.tVipRank
                    : "Deposit rank"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </Pressable>
        </View>

        {/* GRID MENU */}
        <View style={styles.grid}>
          {gridActions.map((item, i) => (
            <Pressable
              key={i}
              style={styles.gridItem}
              onPress={() => handleAction(item)}
            >
              <View style={styles.gridIconWrap}>
                <FontAwesome5 name={item.icon} size={18} color={item.tint} />
              </View>
              <Text style={styles.gridLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* ANNOUNCEMENT */}
        <View style={styles.announcement}>
          <View style={styles.announceIcon}>
            <Ionicons name="volume-medium" size={16} color={colors.primary} />
          </View>
          <Text style={styles.announceText}>
            MirrorTrade analyzes market trends for you.
          </Text>
          <Ionicons name="menu-outline" size={20} color={colors.muted} />
        </View>

        {/* RANKING SECTION */}
        <View style={styles.rankingContainer}>
          <Text style={styles.rankingTitle}>Ranking</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rankingTabs}
          >
            {["Profit", "Commission", "Rewards", "Points", "S-Vol"].map(
              (tab) => (
                <Pressable
                  key={tab}
                  onPress={() => setActiveMainTab(tab)}
                  style={styles.rTabBtn}
                >
                  <Text
                    style={[
                      styles.rTab,
                      activeMainTab === tab && styles.rTabActive,
                    ]}
                  >
                    {tab}
                  </Text>
                  {activeMainTab === tab ? (
                    <View style={styles.rTabIndicator} />
                  ) : null}
                </Pressable>
              )
            )}
            <Ionicons
              name="settings-outline"
              size={18}
              color={colors.muted}
              style={{ marginLeft: 10 }}
            />
          </ScrollView>

          {/* SUB TABS */}
          <View style={styles.subTabsWrap}>
            <View style={styles.subTabs}>
              {["Automated", "Signal", "Manual"].map((tab) => (
                <Pressable
                  key={tab}
                  style={[
                    styles.subTab,
                    activeSubTab === tab && styles.subTabActive,
                  ]}
                  onPress={() => setActiveSubTab(tab)}
                >
                  <Text
                    style={[
                      styles.subTabText,
                      activeSubTab === tab && styles.subTabTextActive,
                    ]}
                  >
                    {tab}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Text style={styles.infoText}>
            Automated data includes both AI Brain and KOL Brain.
          </Text>

          {/* PILL FILTERS */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterPills}
          >
            {["90 Days", "30 Days", "15 Days", "1 Day"].map((filter) => (
              <Pressable
                key={filter}
                style={[
                  styles.pill,
                  activeFilter === filter && styles.pillActive,
                ]}
                onPress={() => setActiveFilter(filter)}
              >
                <Text
                  style={[
                    styles.pillText,
                    activeFilter === filter && styles.pillTextActive,
                  ]}
                >
                  {filter}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.updateText}>
            Next Ranking update: {pad(timeLeft.h)} : {pad(timeLeft.m)} :{" "}
            {pad(timeLeft.s)}
          </Text>

          {/* MY RANKING */}
          <View style={styles.myRankingCard}>
            <View style={styles.myRankLeft}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={styles.myRankBadge}>My Ranking</Text>
                <Ionicons
                  name="help-circle-outline"
                  size={14}
                  color={colors.muted}
                  style={{ marginLeft: 4 }}
                />
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 10,
                }}
              >
                <Text style={styles.myRankNum}>50+</Text>
                <View style={styles.coinIcon}>
                  <Text
                    style={{
                      color: "#fff",
                      fontWeight: "bold",
                      fontSize: 14,
                    }}
                  >
                    ₹
                  </Text>
                </View>
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.myEmail}>
                    {user?.email?.replace(/(.{2})(.*)(@.*)/, "$1***$3") ||
                      "ku***@gmail.com"}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 4,
                    }}
                  >
                    <Text style={{ fontSize: 12 }}>🇮🇳</Text>
                    <View style={styles.tvipBadge}>
                      <Text style={styles.tvipText}>
                        {user?.tVipRank && user.tVipRank !== "NONE"
                          ? user.tVipRank
                          : "T-VIP"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.myRankRight}>
              <Text style={styles.earningLabel}>Earning</Text>
              <Text style={styles.earningValue}>
                0.00 <Text style={styles.usdt}>INR</Text>
              </Text>
            </View>
          </View>

          {/* LIST HEADER */}
          <View style={styles.listHeader}>
            <Text style={styles.listColText}>Profit Ranking</Text>
            <Text style={styles.listColText}>Earning</Text>
          </View>

          {/* LIST ITEMS */}
          {topTraders.map((r, i) => (
            <Pressable
              key={r.id}
              style={styles.rankItem}
              onPress={() =>
                navigation.navigate("TraderDetail", { traderId: r.id })
              }
            >
              <View style={styles.rankItemLeft}>
                <View
                  style={[
                    styles.rankBadge,
                    { backgroundColor: RANK_MEDAL[i] || colors.elevated },
                  ]}
                >
                  <Text style={styles.medalText}>{r.rank}</Text>
                </View>
                <Image source={{ uri: r.avatarImg }} style={styles.avatarImg} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.rName}>{r.name}</Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 4,
                    }}
                  >
                    <Text style={{ fontSize: 12 }}>{r.flag}</Text>
                    <View style={styles.tvipBadgeRank}>
                      <Text style={styles.tvipText}>{r.vip}</Text>
                    </View>
                  </View>
                </View>
              </View>
              <Text style={styles.rEarning}>
                +₹{r.earning} <Text style={styles.usdt}>INR</Text>
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: 45,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  topNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
  },
  profileIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  topNavRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  navIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteBanner: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(91,108,255,0.3)",
  },
  inviteLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  giftIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  inviteText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  inviteBonus: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2,
  },
  inviteBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  inviteBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 12,
  },
  vipRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    marginTop: 16,
    gap: 8,
  },
  vipCard: {
    flex: 1,
    flexDirection: "row",
    minHeight: 68,
    borderRadius: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 8,
  },
  vipIcon: {
    opacity: 0.95,
  },
  vipText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
  },
  vipSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 10,
    marginTop: 20,
  },
  gridItem: {
    width: "25%",
    alignItems: "center",
    marginBottom: 18,
  },
  gridIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  gridLabel: {
    color: colors.text,
    fontSize: 11,
    marginTop: 8,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 2,
  },
  announcement: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "space-between",
  },
  announceIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  announceText: {
    color: colors.muted,
    fontSize: 12,
    flex: 1,
    marginHorizontal: 10,
    fontWeight: "500",
  },
  rankingContainer: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  rankingTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  rankingTabs: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rTabBtn: {
    marginRight: 20,
    position: "relative",
    paddingBottom: 10,
  },
  rTab: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
  },
  rTabActive: {
    color: colors.text,
  },
  rTabIndicator: {
    position: "absolute",
    bottom: -1,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  subTabsWrap: {
    marginTop: 16,
    alignItems: "center",
  },
  subTabs: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    width: "100%",
    padding: 4,
  },
  subTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  subTabActive: {
    backgroundColor: colors.primary,
  },
  subTabText: {
    color: colors.muted,
    fontWeight: "700",
    fontSize: 13,
  },
  subTabTextActive: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
  },
  infoText: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 14,
  },
  filterPills: {
    flexDirection: "row",
    marginTop: 14,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: {
    backgroundColor: colors.primarySoft,
    borderColor: "rgba(91,108,255,0.45)",
  },
  pillText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  pillTextActive: {
    color: colors.primary,
  },
  updateText: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 14,
  },
  myRankingCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  myRankLeft: {
    flex: 1,
  },
  myRankBadge: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  myRankNum: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
  },
  coinIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    marginLeft: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  myEmail: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  tvipBadge: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: "rgba(91,108,255,0.35)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  tvipBadgeRank: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: "rgba(91,108,255,0.35)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  tvipText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "800",
  },
  myRankRight: {
    alignItems: "flex-end",
  },
  earningLabel: {
    color: colors.muted,
    fontSize: 12,
  },
  earningValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 4,
  },
  usdt: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "600",
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 8,
  },
  listColText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  rankItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rankItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  medalText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
  },
  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  rEarning: {
    color: colors.profit,
    fontSize: 14,
    fontWeight: "800",
  },
});
