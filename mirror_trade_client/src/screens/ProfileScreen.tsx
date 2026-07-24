import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { CommonActions, useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getApiErrorMessage,
  getMyPlanStatusRequest,
  getMyTransactionsRequest,
  listExchangesRequest,
  syncExchangeCapitalRequest,
  withTimeout,
  type ExchangeConnection,
  type PlanStatus,
  type PlanTransaction,
} from "../config/api";
import { formatMoney } from "../config/currency";
import { VipMiniSpark } from "../components/VipCharts";
import { useAuth } from "../context/AuthContext";
import { useAppData } from "../context/AppDataContext";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

// Align Assets tab with Home theme tokens
const BG = colors.bg;
const CARD = colors.card;
const CARD_ELEVATED = colors.elevated;
const BORDER = colors.border;
const MUTED = colors.muted;
const TEXT = colors.text;
const YELLOW = colors.primary;
const MINT = "#B8F5D4";
const MINT_BG = "#1A2E28";
const BLUE_CARD = colors.elevated;
const BLUE_TEXT = colors.brand;

const TYPE_LABELS: Record<string, string> = {
  DEPOSIT: "Exchange stats update",
  BNB_DEPOSIT: "BNB deposit (USDT)",
  LEVEL_PURCHASE: "VIP level purchase",
  T_VIP_PROFIT_SHARE: "T-VIP Profit Share",
  SAME_LEVEL_BONUS: "Same Level Bonus",
  GLOBAL_DEV_BONUS: "Global Dev Bonus",
  REFERRAL_REWARD: "Referral reward",
  WITHDRAWAL: "Withdrawal",
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, exchangeConnected, refreshUser } = useAuth();
  const { settings, updateSettings, unreadCount } = useAppData();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [status, setStatus] = useState<PlanStatus | null>(null);
  const [txs, setTxs] = useState<PlanTransaction[]>([]);
  const [exchanges, setExchanges] = useState<ExchangeConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [marketTab, setMarketTab] = useState<"spot" | "futures">("spot");
  const [hideBal, setHideBal] = useState(false);

  const load = useCallback(async () => {
    try {
      const [planRes, txRes, exRes] = await Promise.all([
        withTimeout(getMyPlanStatusRequest()).catch(() => null),
        withTimeout(getMyTransactionsRequest(8)).catch(() => null),
        withTimeout(listExchangesRequest()).catch(() => null),
      ]);
      if (planRes?.success) setStatus(planRes.data);
      if (txRes?.success) setTxs(txRes.data);
      if (exRes?.success) setExchanges(exRes.data || []);
      await refreshUser().catch(() => undefined);
    } catch {
      // keep last good data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshUser]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const levelCapital = status?.totalDeposit ?? user?.totalDeposit ?? 0;
  const usdtBal = status?.usdtBalance ?? status?.depositBalance ?? user?.usdtBalance ?? 0;
  const earnings =
    status?.withdrawable ?? status?.walletBalance ?? user?.walletBalance ?? 0;
  const exchangeCap =
    status?.exchangeCapital ?? exchanges[0]?.lastCapital ?? user?.exchangeCapital ?? 0;
  const teamBiz = status?.teamBusiness ?? 0;
  const tVip = status?.tVipRank || user?.tVipRank || "NONE";
  const cVip = status?.cVipRank || user?.cVipRank || "NONE";
  const displayId = user?.referralCode || user?.name?.slice(0, 8).toUpperCase() || "USER";
  const nextT = status?.nextTVip;
  const tProgressRaw = Number(status?.tVipProgress?.percent);
  const tProgress = Number.isFinite(tProgressRaw)
    ? Math.max(0, Math.min(100, tProgressRaw))
    : 0;
  const primaryEx = exchanges[0]?.exchange || user?.primaryExchange || null;
  const available = usdtBal;

  const mask = (n: number, decimals = 2) =>
    hideBal ? "****" : formatMoney(n, { decimals });

  const copyId = () => {
    Alert.alert("Copied", displayId);
  };

  const onSync = async () => {
    if (!exchanges.length && !exchangeConnected) {
      Alert.alert(
        "Connect exchange",
        "Connect a trade-only API key to load trading statistics (P/L). VIP levels are bought with USDT deposits.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Connect",
            onPress: () => navigation.navigate("ExchangeConnect"),
          },
        ]
      );
      return;
    }
    setSyncing(true);
    try {
      const res = await syncExchangeCapitalRequest();
      const cap = res.data.capital;
      Alert.alert(
        "Trading stats refreshed",
        `Exchange equity: ${formatMoney(cap.exchangeCapital ?? cap.totalDeposit, { decimals: 2 })} USDT\nVIP levels use purchased capital, not exchange balance.`
      );
      await load();
    } catch (err) {
      Alert.alert("Refresh failed", getApiErrorMessage(err, "Could not sync stats"));
    } finally {
      setSyncing(false);
    }
  };

  const onLogout = async () => {
    await logout();
    const root = navigation.getParent() ?? navigation;
    root.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "Auth" }],
      })
    );
  };

  const actions: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
  }[] = [
    {
      icon: "arrow-down-circle-outline",
      label: "Deposit",
      onPress: () => navigation.navigate("Deposit"),
    },
    {
      icon: "arrow-up-circle-outline",
      label: "Withdraw",
      onPress: () => navigation.navigate("Withdraw"),
    },
    {
      icon: "qr-code-outline",
      label: "Invite",
      onPress: () => {
        // Assets tab → Invite & Earn (root stack)
        const parent = navigation.getParent?.();
        if (parent) parent.navigate("Referral" as never);
        else navigation.navigate("Referral");
      },
    },
    {
      icon: "share-social-outline",
      label: "Share",
      onPress: async () => {
        try {
          const { shareMyInvite } = await import("../utils/shareInvite");
          await shareMyInvite(user?.referralCode);
        } catch (e) {
          Alert.alert(
            "Share failed",
            e instanceof Error ? e.message : "Could not share invite"
          );
        }
      },
    },
    {
      icon: "star-outline",
      label: "VIP",
      onPress: () => {
        const parent = navigation.getParent?.();
        if (parent) parent.navigate("TeamRank" as never);
        else navigation.navigate("TeamRank");
      },
    },
  ];

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 8) }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: 28 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={YELLOW}
          />
        }
      >
        {/* Top identity */}
        <View style={styles.topRow}>
          <Pressable style={styles.idRow} onPress={copyId}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={16} color={TEXT} />
            </View>
            <Text style={styles.userId} numberOfLines={1}>
              {displayId}
            </Text>
            <Ionicons name="copy-outline" size={16} color={MUTED} />
          </Pressable>
          <View style={styles.vipRow}>
            <View style={[styles.vipBadge, styles.vipT]}>
              <Text style={styles.vipBadgeText}>
                {tVip !== "NONE" ? tVip.replace("T-", "T-") : "T-VIP"}
              </Text>
            </View>
            <View style={[styles.vipBadge, styles.vipC]}>
              <Text style={[styles.vipBadgeText, { color: "#F7A600" }]}>
                {cVip !== "NONE" ? cVip.replace("C-", "C-") : "C-VIP"}
              </Text>
            </View>
          </View>
        </View>

        {/* Progress / holdings card */}
        <View style={styles.progressCard}>
          <View style={styles.progressTop}>
            <Text style={styles.progressLabel}>
              Next level progress: {Math.min(100, tProgress)}%
            </Text>
            <Pressable
              style={styles.detailLink}
              onPress={() => navigation.navigate("TeamRank", { focus: "T-VIP" })}
            >
              <Text style={styles.detailText}>Detail</Text>
              <Ionicons name="chevron-forward" size={14} color={MUTED} />
            </Pressable>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${tProgress}%` }]} />
          </View>
          <Text style={styles.holdingsText}>
            Level capital: {mask(levelCapital, 0)}
            {nextT
              ? `  →  ${formatMoney(nextT.minDeposit, { decimals: 0 })} for ${nextT.rank}`
              : "  ·  Max T-VIP reached"}
          </Text>

          <View style={styles.statTrio}>
            <View style={styles.statCell}>
              <View style={styles.statHead}>
                <Text style={styles.statName}>Level $</Text>
                <Ionicons name="help-circle-outline" size={12} color={MUTED} />
              </View>
              <Text style={styles.statVal}>{mask(levelCapital, 0)}</Text>
            </View>
            <View style={styles.statCell}>
              <View style={styles.statHead}>
                <Text style={styles.statName}>Earnings</Text>
                <Ionicons name="help-circle-outline" size={12} color={MUTED} />
              </View>
              <Text style={styles.statVal}>{mask(earnings, 0)}</Text>
            </View>
            <Pressable
              style={styles.statCell}
              onPress={() => navigation.navigate("TeamRank", { focus: "C-VIP" })}
            >
              <View style={styles.statHead}>
                <Text style={styles.statName}>Team</Text>
                <Ionicons name="chevron-forward" size={12} color={MUTED} />
              </View>
              <Text style={styles.statVal}>{mask(teamBiz, 0)}</Text>
            </Pressable>
          </View>
        </View>

        {/* Balance */}
        <View style={styles.balanceSection}>
          <View style={styles.balanceHead}>
            <View style={styles.statHead}>
              <Text style={styles.sectionTitle}>Balance (USD)</Text>
              <Ionicons name="help-circle-outline" size={14} color={MUTED} />
            </View>
            <Pressable
              style={styles.statHead}
              onPress={() => setHideBal((v) => !v)}
            >
              <Text style={styles.convertText}>Hide amounts</Text>
              <Ionicons
                name={hideBal ? "eye-off-outline" : "eye-outline"}
                size={14}
                color={MUTED}
              />
            </Pressable>
          </View>

          <View style={styles.balCards}>
            <View style={[styles.balCard, styles.balUsdt]}>
              <View style={styles.balChip}>
                <Text style={styles.balChipText}>₮ USDT</Text>
              </View>
              <Text style={styles.balAmount}>{mask(available, 2)}</Text>
              <Text style={{ color: MUTED, fontSize: 10, marginTop: 4 }}>
                Deposit · buy levels
              </Text>
            </View>
            <View style={[styles.balCard, styles.balUsdc]}>
              <View style={[styles.balChip, styles.balChipBlue]}>
                <Text style={[styles.balChipText, { color: BLUE_TEXT }]}>$ Earn</Text>
              </View>
              <Text style={[styles.balAmount, { color: BLUE_TEXT }]}>
                {mask(earnings, 2)}
              </Text>
              <Text style={{ color: MUTED, fontSize: 10, marginTop: 4 }}>
                Withdrawable
              </Text>
            </View>
          </View>

          {/* Quick actions */}
          <View style={styles.actionsRow}>
            {actions.map((a) => (
              <Pressable key={a.label} style={styles.actionItem} onPress={a.onPress}>
                <View style={styles.actionIcon}>
                  <Ionicons name={a.icon} size={22} color={TEXT} />
                </View>
                <Text style={styles.actionLabel}>{a.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Recent records */}
        <View style={styles.recordsSection}>
          <View style={styles.balanceHead}>
            <Text style={styles.sectionTitle}>Recent Records</Text>
            <Pressable
              style={styles.statHead}
              onPress={() => navigation.navigate("TeamRank")}
            >
              <Text style={styles.moreText}>More</Text>
              <Ionicons name="chevron-forward" size={14} color={MUTED} />
            </Pressable>
          </View>

          {loading && !txs.length ? (
            <Text style={styles.empty}>Loading records…</Text>
          ) : txs.length === 0 ? (
            <Text style={styles.empty}>No records yet</Text>
          ) : (
            txs.slice(0, 4).map((t) => {
              const isOut = t.type === "WITHDRAWAL";
              return (
                <View key={t.id} style={styles.recordRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recordType}>
                      {TYPE_LABELS[t.type] || t.type}
                    </Text>
                    <Text style={styles.recordDate}>
                      {new Date(t.createdAt).toLocaleString("en-IN")}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.recordAmt,
                      { color: isOut ? "#FF6B7A" : colors.profit },
                    ]}
                  >
                    {isOut ? "-" : "+"}
                    {hideBal
                      ? "****"
                      : `${Number(t.amount).toFixed(0)} USDT`}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        {/* Spot / Futures + exchange account */}
        <View style={styles.marketTabs}>
          {(["spot", "futures"] as const).map((t) => (
            <Pressable key={t} onPress={() => setMarketTab(t)} style={styles.marketTab}>
              <Text
                style={[
                  styles.marketTabText,
                  marketTab === t && styles.marketTabTextActive,
                ]}
              >
                {t === "spot" ? "Spot" : "Futures"}
              </Text>
              {marketTab === t ? <View style={styles.marketUnderline} /> : null}
            </Pressable>
          ))}
        </View>

        <View style={styles.exCard}>
          <View style={styles.exHead}>
            <View style={styles.exLeft}>
              <View style={styles.exLogo}>
                <MaterialCommunityIcons
                  name="swap-horizontal-bold"
                  size={16}
                  color={YELLOW}
                />
              </View>
              <Text style={styles.exTitle}>
                {primaryEx
                  ? `${primaryEx.charAt(0).toUpperCase()}${primaryEx.slice(1)} Account`
                  : "Exchange Account"}
              </Text>
              <View style={styles.usdtTag}>
                <Text style={styles.usdtTagText}>USDT</Text>
              </View>
            </View>
            <Pressable
              style={styles.statHead}
              onPress={() => navigation.navigate("ExchangeConnect")}
            >
              <Text style={styles.moreText}>More</Text>
              <Ionicons name="chevron-forward" size={14} color={MUTED} />
            </Pressable>
          </View>

          <View style={styles.exStats}>
            <View style={styles.exStat}>
              <Text style={styles.exStatLabel}>Est. Total Value</Text>
              <Text style={styles.exStatVal}>
                {mask(exchangeCap + usdtBal + earnings, 0)}
              </Text>
            </View>
            <View style={styles.exStat}>
              <Text style={styles.exStatLabel}>Available USDT</Text>
              <Text style={styles.exStatVal}>{mask(available, 0)}</Text>
            </View>
            <View style={[styles.exStat, styles.exStatBorder]}>
              <Text style={styles.exStatLabel}>Level capital</Text>
              <Text style={[styles.exStatVal, { color: YELLOW }]}>
                {mask(levelCapital, 0)}
              </Text>
            </View>
          </View>

          <Text style={styles.exHint}>
            {primaryEx || exchanges.length
              ? "Exchange API drives trading stats only. VIP levels come from purchased USDT capital."
              : "Deposit BNB for USDT · buy VIP levels · connect API for trading P/L stats."}
          </Text>

          <Pressable
            style={[styles.refreshBtn, syncing && { opacity: 0.7 }]}
            onPress={onSync}
            disabled={syncing}
          >
            {syncing ? (
              <ActivityIndicator color="#111" />
            ) : (
              <Text style={styles.refreshBtnText}>Refresh trading stats</Text>
            )}
          </Pressable>
        </View>

        {/* Settings / account menu — same features as before */}
        <View style={styles.menuCard}>
          <Pressable
            style={styles.menuRow}
            onPress={() => navigation.navigate("TeamRank")}
          >
            <Ionicons name="trophy-outline" size={18} color={MUTED} />
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTextOnly}>VIP Levels</Text>
              <Text style={styles.menuHint}>
                {tVip !== "NONE" ? tVip : "T-VIP"} · {cVip !== "NONE" ? cVip : "C-VIP"} ·
                charts
              </Text>
            </View>
            <VipMiniSpark capital={levelCapital} />
            <Ionicons name="chevron-forward" size={16} color={MUTED} />
          </Pressable>
          <Pressable
            style={styles.menuRow}
            onPress={() => navigation.navigate("ExchangeConnect")}
          >
            <Ionicons name="link-outline" size={18} color={MUTED} />
            <Text style={styles.menuText}>API Connect</Text>
            <Ionicons name="chevron-forward" size={16} color={MUTED} />
          </Pressable>
          <Pressable
            style={styles.menuRow}
            onPress={() => navigation.navigate("Security")}
          >
            <Ionicons name="shield-outline" size={18} color={MUTED} />
            <Text style={styles.menuText}>Security & 2FA</Text>
            <Ionicons name="chevron-forward" size={16} color={MUTED} />
          </Pressable>
          <Pressable
            style={styles.menuRow}
            onPress={() => navigation.navigate("Notifications")}
          >
            <Ionicons name="notifications-outline" size={18} color={MUTED} />
            <Text style={styles.menuText}>Notifications</Text>
            {unreadCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            ) : null}
            <Ionicons name="chevron-forward" size={16} color={MUTED} />
          </Pressable>
          <Pressable
            style={styles.menuRow}
            onPress={() => navigation.navigate("Language")}
          >
            <Ionicons name="globe-outline" size={18} color={MUTED} />
            <Text style={styles.menuText}>Language & Region</Text>
            <Ionicons name="chevron-forward" size={16} color={MUTED} />
          </Pressable>
          <Pressable
            style={styles.menuRow}
            onPress={() => navigation.navigate("TradingPrefs")}
          >
            <Ionicons name="pulse-outline" size={18} color={MUTED} />
            <Text style={styles.menuText}>Trading Preferences</Text>
            <Ionicons name="chevron-forward" size={16} color={MUTED} />
          </Pressable>
          <Pressable
            style={styles.menuRow}
            onPress={() => navigation.navigate("Help")}
          >
            <Ionicons name="help-circle-outline" size={18} color={MUTED} />
            <Text style={styles.menuText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={16} color={MUTED} />
          </Pressable>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuText}>Trade notifications</Text>
              <Text style={styles.toggleSub}>{unreadCount} unread</Text>
            </View>
            <Switch
              value={settings.tradeNotifications}
              onValueChange={(v) => updateSettings({ tradeNotifications: v })}
              trackColor={{ true: YELLOW, false: BORDER }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <Pressable onPress={onLogout} style={styles.logout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { paddingHorizontal: 14 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    gap: 8,
  },
  idRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: CARD_ELEVATED,
    alignItems: "center",
    justifyContent: "center",
  },
  userId: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
    maxWidth: 140,
  },
  vipRow: { flexDirection: "row", gap: 6, flexShrink: 0 },
  vipBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  vipT: {
    backgroundColor: "rgba(247,166,0,0.15)",
    borderColor: "rgba(247,166,0,0.45)",
  },
  vipC: {
    backgroundColor: "rgba(138,92,246,0.15)",
    borderColor: "rgba(138,92,246,0.4)",
  },
  vipBadgeText: {
    color: "#F7A600",
    fontSize: 10,
    fontWeight: "800",
  },

  progressCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 14,
  },
  progressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  progressLabel: { color: MUTED, fontSize: 12, fontWeight: "600" },
  detailLink: { flexDirection: "row", alignItems: "center", gap: 2 },
  detailText: { color: MUTED, fontSize: 12 },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: CARD_ELEVATED,
    marginBottom: 8,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: "#E8E8E8",
  },
  holdingsText: { color: MUTED, fontSize: 11, marginBottom: 14 },
  statTrio: { flexDirection: "row" },
  statCell: { flex: 1 },
  statHead: { flexDirection: "row", alignItems: "center", gap: 4 },
  statName: { color: MUTED, fontSize: 12 },
  statVal: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 4,
  },

  balanceSection: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 14,
  },
  balanceHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { color: TEXT, fontSize: 16, fontWeight: "800" },
  convertText: { color: MUTED, fontSize: 12 },
  balCards: { flexDirection: "row", gap: 10, marginBottom: 18 },
  balCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 78,
  },
  balUsdt: { backgroundColor: MINT_BG },
  balUsdc: { backgroundColor: BLUE_CARD },
  balChip: {
    alignSelf: "flex-start",
    backgroundColor: MINT,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 10,
  },
  balChipBlue: { backgroundColor: "#2A3F6E" },
  balChipText: { color: "#0A1F16", fontSize: 11, fontWeight: "800" },
  balAmount: { color: MINT, fontSize: 20, fontWeight: "800" },

  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  actionItem: { alignItems: "center", width: "22%" },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: CARD_ELEVATED,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  actionLabel: { color: MUTED, fontSize: 11, fontWeight: "600" },

  recordsSection: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 14,
  },
  moreText: { color: MUTED, fontSize: 13, fontWeight: "600" },
  empty: { color: MUTED, fontSize: 13, paddingVertical: 8 },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  recordType: { color: TEXT, fontSize: 14, fontWeight: "600" },
  recordDate: { color: MUTED, fontSize: 11, marginTop: 3 },
  recordAmt: { fontSize: 14, fontWeight: "800" },

  marketTabs: {
    flexDirection: "row",
    gap: 18,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  marketTab: { paddingBottom: 6 },
  marketTabText: { color: MUTED, fontSize: 15, fontWeight: "700" },
  marketTabTextActive: { color: TEXT },
  marketUnderline: {
    marginTop: 6,
    height: 3,
    borderRadius: 2,
    backgroundColor: YELLOW,
    width: "100%",
  },

  exCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 14,
  },
  exHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  exLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  exLogo: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: CARD_ELEVATED,
    alignItems: "center",
    justifyContent: "center",
  },
  exTitle: { color: TEXT, fontSize: 14, fontWeight: "700" },
  usdtTag: {
    backgroundColor: "rgba(0,208,132,0.15)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  usdtTagText: { color: colors.profit, fontSize: 10, fontWeight: "800" },
  exStats: { flexDirection: "row", marginBottom: 12 },
  exStat: { flex: 1 },
  exStatBorder: {
    borderLeftWidth: 1,
    borderLeftColor: BORDER,
    paddingLeft: 12,
  },
  exStatLabel: { color: MUTED, fontSize: 11, marginBottom: 4 },
  exStatVal: { color: TEXT, fontSize: 16, fontWeight: "800" },
  exHint: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  refreshBtn: {
    backgroundColor: YELLOW,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  refreshBtnText: {
    color: "#111",
    fontSize: 15,
    fontWeight: "800",
  },

  menuCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
    marginBottom: 12,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  menuText: { flex: 1, color: TEXT, fontSize: 14, fontWeight: "600" },
  menuTextOnly: { color: TEXT, fontSize: 14, fontWeight: "600" },
  menuHint: { color: MUTED, fontSize: 11, marginTop: 2 },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  toggleSub: { color: MUTED, fontSize: 11, marginTop: 2 },
  logout: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,59,92,0.35)",
    backgroundColor: "rgba(255,59,92,0.08)",
    paddingVertical: 14,
    marginBottom: 8,
  },
  logoutText: { fontSize: 14, fontWeight: "700", color: colors.loss },
});
