import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from "react-native";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { RootStackParamList } from "../navigation/types";
import {
  listTradersRequest,
  type ApiTrader,
} from "../config/api";
import {
  loadInvitePayload,
  shareMyInvite,
  type InvitePayload,
} from "../utils/shareInvite";

const APP_BG = "#1A1B26";
const CARD_BG = "#242633";
const CARD_BORDER = "#2E3142";
const YELLOW = "#FFD143";
const MUTED = "#94A3B8";
const TEXT = "#F8FAFC";
const DIRECT_TARGET = 3;

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
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const tabNav = useNavigation<any>();

  const [invite, setInvite] = useState<InvitePayload | null>(null);
  const [sharing, setSharing] = useState(false);
  const [traders, setTraders] = useState<ApiTrader[]>([]);

  const goRoot = useCallback(
    (screen: keyof RootStackParamList, params?: object) => {
      const parent = navigation.getParent?.() as
        | { navigate: (name: string, p?: object) => void }
        | undefined;
      if (parent?.navigate) {
        parent.navigate(screen, params);
        return;
      }
      (navigation.navigate as (name: string, p?: object) => void)(
        screen,
        params
      );
    },
    [navigation]
  );

  const openInviteScreen = useCallback(() => {
    if (!user) {
      Alert.alert("Login required", "Sign in to invite friends and earn rewards.");
      goRoot("Auth");
      return;
    }
    goRoot("Referral");
  }, [user, goRoot]);

  const handleShareInvite = useCallback(async () => {
    if (!user) {
      Alert.alert("Login required", "Sign in to get your referral code.");
      goRoot("Auth");
      return;
    }
    setSharing(true);
    try {
      const payload = await shareMyInvite(user.referralCode);
      if (payload) setInvite(payload);
    } catch (e) {
      Alert.alert(
        "Share failed",
        e instanceof Error ? e.message : "Could not open share sheet"
      );
    } finally {
      setSharing(false);
    }
  }, [user, goRoot]);

  useFocusEffect(
    useCallback(() => {
      refreshUser().catch(() => undefined);
      if (user) {
        loadInvitePayload(user.referralCode)
          .then(setInvite)
          .catch(() => undefined);
      }
      listTradersRequest({ sort: "roi" })
        .then((res) => {
          if (res.success) setTraders((res.data || []).slice(0, 4));
        })
        .catch(() => undefined);
    }, [refreshUser, user])
  );

  const handleAction = (item: (typeof gridActions)[number]) => {
    if (item.route === "Referral") {
      openInviteScreen();
      return;
    }
    if (item.route) goRoot(item.route as keyof RootStackParamList);
    else if (item.tab) tabNav.navigate(item.tab);
  };

  const reward = invite?.rewardPerUser ?? 50;
  const completed = invite?.stats?.completed ?? 0;
  const totalInvites = invite?.stats?.totalInvites ?? 0;
  const progressCount = Math.min(DIRECT_TARGET, completed || totalInvites);
  const progressPct = Math.min(100, (progressCount / DIRECT_TARGET) * 100);
  const codeLabel = invite?.referralCode || user?.referralCode || "—";
  const rewardsEarned = invite?.stats?.rewardsEarned ?? 0;

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
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
            <Ionicons name="person" size={18} color={APP_BG} />
          </Pressable>
          <Text style={styles.brand}>MirrorTrade</Text>
          <View style={styles.topNavRight}>
            <Pressable
              style={styles.navIcon}
              onPress={handleShareInvite}
              disabled={sharing}
              hitSlop={8}
            >
              {sharing ? (
                <ActivityIndicator size="small" color={TEXT} />
              ) : (
                <Ionicons name="paper-plane-outline" size={22} color={TEXT} />
              )}
            </Pressable>
            <Pressable
              style={styles.navIcon}
              onPress={() => goRoot("Notifications")}
              hitSlop={8}
            >
              <Ionicons name="notifications-outline" size={22} color={TEXT} />
            </Pressable>
          </View>
        </View>

        {/* INVITE CARD */}
        <View style={styles.inviteCard}>
          <LinearGradient
            colors={["rgba(255,209,67,0.14)", "rgba(36,38,51,0)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.inviteTop}>
            <View style={styles.inviteIconWrap}>
              <Ionicons name="gift" size={22} color={YELLOW} />
            </View>
            <View style={styles.inviteHeadText}>
              <Text style={styles.inviteTitle}>Invite & Earn</Text>
              <Text style={styles.inviteSub}>
                Get ₹{reward} for every friend who joins & verifies
              </Text>
            </View>
          </View>

          <View style={styles.progressBlock}>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabel}>
                Direct invites {progressCount}/{DIRECT_TARGET}
              </Text>
              <Text style={styles.progressEarned}>
                Earned ₹{Number(rewardsEarned).toLocaleString("en-IN")}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${progressPct}%` }]}
              />
            </View>
          </View>

          <View style={styles.codeRow}>
            <View style={styles.codeChip}>
              <Text style={styles.codeHint}>Your code</Text>
              <Text style={styles.codeValue} numberOfLines={1}>
                {codeLabel}
              </Text>
            </View>
            <Pressable
              style={styles.codeAction}
              onPress={openInviteScreen}
              hitSlop={6}
            >
              <Ionicons name="open-outline" size={16} color={YELLOW} />
            </Pressable>
          </View>

          <View style={styles.inviteActions}>
            <Pressable
              style={[styles.shareBtn, sharing && { opacity: 0.75 }]}
              onPress={handleShareInvite}
              disabled={sharing}
            >
              {sharing ? (
                <ActivityIndicator size="small" color="#111" />
              ) : (
                <>
                  <Ionicons name="share-social" size={16} color="#111" />
                  <Text style={styles.shareBtnText}>Share Invite</Text>
                </>
              )}
            </Pressable>
            <Pressable style={styles.detailsBtn} onPress={openInviteScreen}>
              <Text style={styles.detailsBtnText}>Details</Text>
            </Pressable>
          </View>
        </View>

        {/* VIP ENTRY */}
        <View style={styles.vipRow}>
          <Pressable
            style={styles.vipPress}
            onPress={() => goRoot("TeamRank", { focus: "C-VIP" })}
          >
            <LinearGradient
              colors={["#3A3428", "#2A261C"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.vipCard}
            >
              <MaterialCommunityIcons name="crown-outline" size={20} color={YELLOW} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.vipLabel}>C-VIP</Text>
                <Text style={styles.vipValue} numberOfLines={1}>
                  {user?.cVipRank && user.cVipRank !== "NONE"
                    ? user.cVipRank
                    : "Team rank"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={MUTED} />
            </LinearGradient>
          </Pressable>
          <Pressable
            style={styles.vipPress}
            onPress={() => goRoot("TeamRank", { focus: "T-VIP" })}
          >
            <LinearGradient
              colors={["#3A3428", "#2A261C"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.vipCard}
            >
              <MaterialCommunityIcons
                name="diamond-stone"
                size={20}
                color={YELLOW}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.vipLabel}>T-VIP</Text>
                <Text style={styles.vipValue} numberOfLines={1}>
                  {user?.tVipRank && user.tVipRank !== "NONE"
                    ? user.tVipRank
                    : "Deposit rank"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={MUTED} />
            </LinearGradient>
          </Pressable>
        </View>

        {/* GRID */}
        <View style={styles.grid}>
          {gridActions.map((item, i) => (
            <Pressable
              key={i}
              style={styles.gridItem}
              onPress={() => handleAction(item)}
            >
              <View style={styles.gridIcon}>
                <FontAwesome5 name={item.icon} size={18} color={TEXT} />
              </View>
              <Text style={styles.gridLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* ANNOUNCEMENT */}
        <View style={styles.announcement}>
          <Ionicons name="volume-medium-outline" size={18} color={MUTED} />
          <Text style={styles.announceText}>
            MirrorTrade analyzes market trends for you.
          </Text>
        </View>

        {/* TOP TRADERS — clean list, no ranking medals/badges */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Top traders</Text>
            <Pressable onPress={() => tabNav.navigate("Discover")}>
              <Text style={styles.sectionLink}>See all</Text>
            </Pressable>
          </View>

          {traders.length === 0 ? (
            <View style={styles.emptyTraders}>
              <Text style={styles.emptyText}>Loading traders…</Text>
            </View>
          ) : (
            traders.map((t) => (
              <Pressable
                key={t.id}
                style={styles.traderRow}
                onPress={() => goRoot("TraderDetail", { traderId: t.id })}
              >
                <View style={styles.traderAvatar}>
                  <Text style={styles.traderAvatarText}>{t.avatar}</Text>
                </View>
                <View style={styles.traderMid}>
                  <Text style={styles.traderName}>{t.name}</Text>
                  <Text style={styles.traderMeta}>
                    {t.winRate}% win · {t.copiers} copiers
                  </Text>
                </View>
                <View style={styles.traderRight}>
                  <Text
                    style={[
                      styles.traderRoi,
                      { color: t.roi30d >= 0 ? "#22C55E" : "#FF3B5C" },
                    ]}
                  >
                    {t.roi30d >= 0 ? "+" : ""}
                    {t.roi30d}%
                  </Text>
                  <Text style={styles.traderRoiHint}>30D</Text>
                </View>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_BG,
  },
  scrollContent: {
    paddingBottom: 36,
  },
  topNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 14,
  },
  profileIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  topNavRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minWidth: 36,
    justifyContent: "flex-end",
  },
  navIcon: {
    padding: 2,
  },

  /* Invite */
  inviteCard: {
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,209,67,0.22)",
    backgroundColor: CARD_BG,
    padding: 16,
    overflow: "hidden",
  },
  inviteTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  inviteIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,209,67,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,209,67,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  inviteHeadText: {
    flex: 1,
    marginLeft: 12,
  },
  inviteTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "800",
  },
  inviteSub: {
    marginTop: 3,
    color: MUTED,
    fontSize: 12,
    lineHeight: 17,
  },
  progressBlock: {
    marginTop: 16,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
  },
  progressEarned: {
    color: YELLOW,
    fontSize: 12,
    fontWeight: "700",
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: YELLOW,
  },
  codeRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  codeChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: "rgba(0,0,0,0.22)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  codeHint: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  codeValue: {
    marginTop: 3,
    color: TEXT,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  codeAction: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: "rgba(255,209,67,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  inviteActions: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
  },
  shareBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: YELLOW,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  shareBtnText: {
    color: "#111",
    fontWeight: "800",
    fontSize: 14,
  },
  detailsBtn: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center",
    justifyContent: "center",
  },
  detailsBtnText: {
    color: TEXT,
    fontWeight: "700",
    fontSize: 13,
  },

  /* VIP */
  vipRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  vipPress: {
    flex: 1,
  },
  vipCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(255,209,67,0.18)",
  },
  vipLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  vipValue: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 2,
  },

  /* Grid */
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
  gridIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  gridLabel: {
    color: "#E2E8F0",
    fontSize: 11,
    marginTop: 8,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 2,
  },

  announcement: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    gap: 10,
  },
  announceText: {
    color: MUTED,
    fontSize: 13,
    flex: 1,
  },

  /* Traders */
  section: {
    marginTop: 22,
    paddingHorizontal: 16,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "800",
  },
  sectionLink: {
    color: YELLOW,
    fontSize: 13,
    fontWeight: "700",
  },
  emptyTraders: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyText: {
    color: MUTED,
    fontSize: 13,
  },
  traderRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 12,
    marginBottom: 10,
  },
  traderAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,209,67,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  traderAvatarText: {
    color: YELLOW,
    fontWeight: "800",
    fontSize: 13,
  },
  traderMid: {
    flex: 1,
    marginLeft: 12,
  },
  traderName: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "700",
  },
  traderMeta: {
    marginTop: 3,
    color: MUTED,
    fontSize: 12,
  },
  traderRight: {
    alignItems: "flex-end",
  },
  traderRoi: {
    fontSize: 14,
    fontWeight: "800",
  },
  traderRoiHint: {
    marginTop: 2,
    color: MUTED,
    fontSize: 10,
    fontWeight: "600",
  },
});
