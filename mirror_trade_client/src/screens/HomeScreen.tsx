import React, { useState, useEffect, useCallback } from "react";
import { Pressable, StyleSheet, Text, View, ScrollView, Image, ImageBackground } from "react-native";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../context/AuthContext";
import { RootStackParamList } from "../navigation/types";
import { traders } from "../data/mock";

const APP_BG = "#1A1B26"; // Rich midnight dark theme from reference
const CARD_BG = "#242633"; // Slightly lighter for cards
const YELLOW = "#FFD143";

const gridActions = [
  { label: "VIP Plans", icon: "crown", route: "TeamRank" },
  { label: "Reward Hub", icon: "gift", route: "Referral" },
  { label: "Profit", icon: "chart-line", tab: "Portfolio" },
  { label: "Invest Control", icon: "shield-alt", route: "Security" },
  { label: "API Connect", icon: "plug", route: "ExchangeConnect" },
  { label: "Invite Friends", icon: "user-plus", route: "Referral" },
  { label: "Coaches", icon: "user-tie", tab: "Discover" },
  { label: "More", icon: "th-large", route: "TradingPrefs" },
];

export default function HomeScreen() {
  const { user, refreshUser } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const tabNav = useNavigation<any>();

  const [activeMainTab, setActiveMainTab] = useState("Profit");
  const [activeSubTab, setActiveSubTab] = useState("Automated");
  const [activeFilter, setActiveFilter] = useState("90 Days");

  const [timeLeft, setTimeLeft] = useState({ h: 14, m: 21, s: 39 });

  // Keep T-VIP / C-VIP badges in sync after deposits / team changes
  useFocusEffect(
    useCallback(() => {
      refreshUser().catch(() => undefined);
    }, [refreshUser])
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
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
    earning: (t.roi30d * 125).toLocaleString(undefined, { minimumFractionDigits: 2 }),
    vip: `T-VIP${6 - index}`,
    flag: ["🇷🇼", "🇮🇩", "🇺🇸"][index % 3],
    avatarImg: `https://i.pravatar.cc/100?u=${t.id}`,
  }));

  const handleAction = (item: any) => {
    if (item.route) navigation.navigate(item.route as any);
    else if (item.tab) tabNav.navigate(item.tab);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* TOP NAV */}
        <View style={styles.topNav}>
          <Pressable style={styles.profileIconWrap} onPress={() => tabNav.navigate("Profile")}>
            <Ionicons name="person" size={18} color="#fff" />
          </Pressable>
          <View style={styles.topNavRight}>
            <Pressable style={styles.navIcon}><Ionicons name="paper-plane-outline" size={24} color="#fff" /></Pressable>
            <Pressable style={styles.navIcon}><Ionicons name="time-outline" size={26} color="#fff" /></Pressable>
            <Pressable style={styles.navIcon} onPress={() => navigation.navigate("Notifications")}>
              <Ionicons name="notifications-outline" size={26} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* INVITE BANNER */}
        <Pressable onPress={() => navigation.navigate("Referral")}>
          <View style={styles.inviteBanner}>
            <View style={styles.inviteLeft}>
              <Image source={{uri: "https://cdn-icons-png.flaticon.com/512/4213/4213958.png"}} style={styles.giftIcon} />
              <View>
                <Text style={styles.inviteText}>Invite 3 Direct Members</Text>
                <Text style={styles.inviteBonus}>+₹10</Text>
              </View>
            </View>
            <View style={styles.inviteBtn}>
              <Text style={styles.inviteBtnText}>Invite Now</Text>
            </View>
          </View>
        </Pressable>

        {/* VIP CARDS — C-VIP (team) & T-VIP (personal deposit) */}
        <View style={styles.vipRow}>
          <Pressable
            style={{ flex: 1 }}
            onPress={() => navigation.navigate("TeamRank", { focus: "C-VIP" })}
          >
            <LinearGradient colors={["#DEB887", "#B8860B"]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.vipCard}>
              <MaterialCommunityIcons name="crown" size={20} color="#fff" style={styles.vipIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.vipText}>C-VIP</Text>
                <Text style={styles.vipSub} numberOfLines={1}>
                  {user?.cVipRank && user.cVipRank !== "NONE" ? user.cVipRank : "Team rank"}
                </Text>
              </View>
            </LinearGradient>
          </Pressable>
          <Pressable
            style={{ flex: 1 }}
            onPress={() => navigation.navigate("TeamRank", { focus: "T-VIP" })}
          >
            <LinearGradient colors={["#FFD700", "#FF8C00"]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.vipCard}>
              <MaterialCommunityIcons name="diamond-stone" size={20} color="#fff" style={styles.vipIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.vipText}>T-VIP</Text>
                <Text style={styles.vipSub} numberOfLines={1}>
                  {user?.tVipRank && user.tVipRank !== "NONE" ? user.tVipRank : "Deposit rank"}
                </Text>
              </View>
            </LinearGradient>
          </Pressable>
        </View>

        {/* GRID MENU */}
        <View style={styles.grid}>
          {gridActions.map((item, i) => (
            <Pressable key={i} style={styles.gridItem} onPress={() => handleAction(item)}>
              <FontAwesome5 name={item.icon} size={22} color="#E2E8F0" />
              <Text style={styles.gridLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* ANNOUNCEMENT */}
        <View style={styles.announcement}>
          <Ionicons name="volume-medium-outline" size={20} color="#94A3B8" />
          <Text style={styles.announceText}>MirrorTrade analyzes market trends for you.</Text>
          <Ionicons name="menu-outline" size={22} color="#94A3B8" />
        </View>

        {/* RANKING SECTION WITH TROPHY BG */}
        <View style={styles.rankingContainer}>
          {/* Trophy Background Image */}
          <Image 
            source={{uri: "https://cdn-icons-png.flaticon.com/512/3176/3176294.png"}} 
            style={styles.trophyBg} 
            resizeMode="contain"
          />

          <Text style={styles.rankingTitle}>Ranking</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rankingTabs}>
            {["Profit", "Commission", "Rewards", "Points", "S-Vol"].map(tab => (
              <Pressable key={tab} onPress={() => setActiveMainTab(tab)} style={styles.rTabBtn}>
                <Text style={[styles.rTab, activeMainTab === tab && styles.rTabActive]}>{tab}</Text>
                {activeMainTab === tab && <View style={styles.rTabIndicator} />}
              </Pressable>
            ))}
            <Ionicons name="settings-outline" size={18} color="#94A3B8" style={{marginLeft: 10}}/>
          </ScrollView>

          {/* SUB TABS */}
          <View style={styles.subTabsWrap}>
            <View style={styles.subTabs}>
              {["Automated", "Signal", "Manual"].map(tab => (
                <Pressable key={tab} style={[styles.subTab, activeSubTab === tab && styles.subTabActive]} onPress={() => setActiveSubTab(tab)}>
                  <Text style={[styles.subTabText, activeSubTab === tab && styles.subTabTextActive]}>{tab}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          
          <Text style={styles.infoText}>Automated data includes both AI Brain and KOL Brain.</Text>

          {/* PILL FILTERS */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPills}>
            {["90 Days", "30 Days", "15 Days", "1 Day"].map(filter => (
              <Pressable key={filter} style={[styles.pill, activeFilter === filter && styles.pillActive]} onPress={() => setActiveFilter(filter)}>
                <Text style={[styles.pillText, activeFilter === filter && styles.pillTextActive]}>{filter}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.updateText}>Next Ranking update: {pad(timeLeft.h)} : {pad(timeLeft.m)} : {pad(timeLeft.s)}</Text>

          {/* MY RANKING */}
          <View style={styles.myRankingCard}>
            <View style={styles.myRankLeft}>
              <View style={{flexDirection: "row", alignItems: "center"}}>
                <Text style={styles.myRankBadge}>My Ranking</Text>
                <Ionicons name="help-circle-outline" size={14} color="#94A3B8" style={{marginLeft:4}} />
              </View>
              <View style={{flexDirection: "row", alignItems: "center", marginTop: 10}}>
                <Text style={styles.myRankNum}>50+</Text>
                <View style={styles.coinIcon}><Text style={{color:"#fff", fontWeight:"bold", fontSize: 18}}>₹</Text></View>
                <View style={{marginLeft: 12}}>
                  <Text style={styles.myEmail}>{user?.email?.replace(/(.{2})(.*)(@.*)/, "$1***$3") || "ku***@gmail.com"}</Text>
                  <View style={{flexDirection: "row", alignItems: "center", marginTop: 4}}>
                    <Text style={{fontSize: 12}}>🇮🇳</Text>
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
              <Text style={styles.earningValue}>0.00 <Text style={styles.usdt}>INR</Text></Text>
            </View>
          </View>

          {/* LIST HEADER */}
          <View style={styles.listHeader}>
            <Text style={styles.listColText}>Profit Ranking</Text>
            <Text style={styles.listColText}>Earning</Text>
          </View>

          {/* LIST ITEMS */}
          {topTraders.map((r, i) => (
            <Pressable key={r.id} style={styles.rankItem} onPress={() => navigation.navigate("TraderDetail", { traderId: r.id })}>
              <View style={styles.rankItemLeft}>
                <ImageBackground 
                  source={{ uri: i === 0 ? "https://cdn-icons-png.flaticon.com/512/744/744922.png" : i === 1 ? "https://cdn-icons-png.flaticon.com/512/744/744984.png" : "https://cdn-icons-png.flaticon.com/512/744/744986.png" }}
                  style={styles.medalBg}
                  imageStyle={{tintColor: i===0?"#FFD700":i===1?"#C0C0C0":"#CD7F32"}}
                >
                  <Text style={styles.medalText}>{r.rank}</Text>
                </ImageBackground>
                <Image source={{ uri: r.avatarImg }} style={styles.avatarImg} />
                <View style={{marginLeft: 12}}>
                  <Text style={styles.rName}>{r.name}</Text>
                  <View style={{flexDirection: "row", alignItems: "center", marginTop: 4}}>
                    <Text style={{fontSize: 12}}>{r.flag}</Text>
                    <View style={styles.tvipBadgeRank}>
                      <Text style={styles.tvipText}>{r.vip}</Text>
                    </View>
                  </View>
                </View>
              </View>
              <Text style={styles.rEarning}>+₹{r.earning} <Text style={styles.usdt}>INR</Text></Text>
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
    backgroundColor: APP_BG,
    paddingTop: 45, // Safe area approx
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
    paddingBottom: 20,
  },
  profileIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  topNavRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  navIcon: {
    padding: 2,
  },
  inviteBanner: {
    marginHorizontal: 16,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inviteLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  giftIcon: {
    width: 40, 
    height: 40, 
    marginRight: 12
  },
  inviteText: {
    color: "#CBD5E1",
    fontSize: 13,
  },
  inviteBonus: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2,
  },
  inviteBtn: {
    backgroundColor: YELLOW,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  inviteBtnText: {
    color: "#000",
    fontWeight: "800",
    fontSize: 13,
  },
  vipRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 20,
    justifyContent: "space-between",
  },
  vipCard: {
    flex: 1,
    flexDirection: "row",
    height: 65,
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  vipIcon: {
    opacity: 0.8,
  },
  vipText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
    fontStyle: "italic",
  },
  vipSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
    marginTop: 24,
  },
  gridItem: {
    width: "25%",
    alignItems: "center",
    marginBottom: 24,
  },
  gridLabel: {
    color: "#F8FAFC",
    fontSize: 12,
    marginTop: 10,
    fontWeight: "600",
  },
  announcement: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "space-between",
  },
  announceText: {
    color: "#CBD5E1",
    fontSize: 13,
    flex: 1,
    marginLeft: 12,
  },
  rankingContainer: {
    marginTop: 24,
    paddingHorizontal: 16,
    position: "relative",
  },
  trophyBg: {
    position: "absolute",
    right: -20,
    top: 20,
    width: 200,
    height: 200,
    opacity: 0.1,
    zIndex: -1,
  },
  rankingTitle: {
    color: "#D4AF37", // A darker gold text for Ranking
    fontSize: 32,
    fontWeight: "900",
    fontStyle: "italic",
    textShadowColor: "rgba(212, 175, 55, 0.4)",
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 10,
  },
  rankingTabs: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  rTabBtn: {
    marginRight: 24,
    position: "relative",
    paddingBottom: 10,
  },
  rTab: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "700",
  },
  rTabActive: {
    color: "#fff",
  },
  rTabIndicator: {
    position: "absolute",
    bottom: -1,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: YELLOW,
    borderRadius: 2,
  },
  subTabsWrap: {
    marginTop: 16,
    alignItems: "center",
  },
  subTabs: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#334155",
    width: "100%",
  },
  subTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 20,
  },
  subTabActive: {
    backgroundColor: YELLOW,
  },
  subTabText: {
    color: "#94A3B8",
    fontWeight: "700",
    fontSize: 13,
  },
  subTabTextActive: {
    color: "#000",
    fontWeight: "800",
    fontSize: 13,
  },
  infoText: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 14,
  },
  filterPills: {
    flexDirection: "row",
    marginTop: 16,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: "transparent",
  },
  pillActive: {
    backgroundColor: "#F1F5F9",
  },
  pillText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
  },
  pillTextActive: {
    color: "#0F172A",
  },
  updateText: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 14,
  },
  myRankingCard: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  myRankLeft: {},
  myRankBadge: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
  },
  myRankNum: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "900",
  },
  coinIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: YELLOW,
    marginLeft: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  myEmail: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "600",
  },
  tvipBadge: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  tvipBadgeRank: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  tvipText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
  myRankRight: {
    alignItems: "flex-end",
  },
  earningLabel: {
    color: "#64748B",
    fontSize: 12,
  },
  earningValue: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 4,
  },
  usdt: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 8,
  },
  listColText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
  },
  rankItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },
  rankItemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  medalBg: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  medalText: {
    color: "#1E293B",
    fontWeight: "900",
    fontSize: 12,
    marginTop: -2,
  },
  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginLeft: 12,
  },
  rName: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "700",
  },
  rEarning: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "800",
  },
});
