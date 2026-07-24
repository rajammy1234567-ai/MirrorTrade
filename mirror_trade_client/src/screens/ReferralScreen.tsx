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
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Screen from "../components/Screen";
import GradientButton from "../components/GradientButton";
import {
  getApiErrorMessage,
  getMyReferralCodeRequest,
  type ReferralStatsResponse,
} from "../config/api";
import { formatMoney } from "../config/currency";
import { useAuth } from "../context/AuthContext";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import {
  buildShareMessage,
  copyInviteCode,
  copyInviteLink,
  openShareInvite,
} from "../utils/shareInvite";

type Props = NativeStackScreenProps<RootStackParamList, "Referral">;
type ReferralData = ReferralStatsResponse["data"];

/**
 * Invite & Earn — share code/link, copy, WhatsApp/SMS via native Share,
 * and live referral stats from GET /api/referrals/my-code.
 */
export default function ReferralScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const res = await getMyReferralCodeRequest();
      if (res.success && res.data) setData(res.data);
      else setError("Could not load referral stats");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load referrals"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const code = data?.referralCode || user?.referralCode || "—";
  const inviteLink =
    data?.inviteLink ||
    `https://mirrortrade.app/signup?ref=${encodeURIComponent(code)}`;
  const reward = data?.rewardPerUser ?? 50;
  const stats = data?.stats;

  const copyCode = async () => {
    try {
      await copyInviteCode(code);
    } catch {
      Alert.alert("Copy failed", code);
    }
  };

  const copyLink = async () => {
    try {
      await copyInviteLink(inviteLink);
    } catch {
      Alert.alert("Copy failed", inviteLink);
    }
  };

  /** Share Invite — WhatsApp / SMS / system share sheet */
  const shareInvite = async () => {
    if (!code || code === "—") {
      Alert.alert("No code yet", "Sign in again to generate your referral code.");
      return;
    }
    setSharing(true);
    try {
      await openShareInvite({
        referralCode: code,
        inviteLink,
        rewardPerUser: reward,
        shareMessage: buildShareMessage(code, inviteLink, reward),
      });
    } finally {
      setSharing(false);
    }
  };

  return (
    <Screen>
      <View style={styles.nav}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={18} color={colors.text} />
        </Pressable>
        <Text style={styles.navTitle}>Invite & Earn</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading && !data ? (
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

          <View style={styles.hero}>
            <Text style={styles.earnLabel}>Rewards earned</Text>
            <Text style={styles.earn}>
              {formatMoney(stats?.rewardsEarned ?? 0, { decimals: 0 })}
            </Text>
            <Text style={styles.earnSub}>
              ${reward} for you + ${reward} for each friend after they verify
            </Text>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats?.totalInvites ?? 0}</Text>
              <Text style={styles.statLabel}>Total invites</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats?.completed ?? 0}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats?.pending ?? 0}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>

          {/* Code card */}
          <View style={styles.card}>
            <Text style={styles.label}>Your referral code</Text>
            <View style={styles.codeRow}>
              <Text style={styles.code} selectable>
                {code}
              </Text>
              <Pressable style={styles.copy} onPress={copyCode}>
                <Ionicons name="copy-outline" size={16} color={colors.primary} />
                <Text style={styles.copyText}>Copy</Text>
              </Pressable>
            </View>
            <Text style={styles.linkLabel}>Invite link</Text>
            <Text style={styles.link} numberOfLines={2} selectable>
              {inviteLink}
            </Text>
            <Pressable style={styles.copyLinkBtn} onPress={copyLink}>
              <Text style={styles.copyLinkText}>Copy link</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>How it works</Text>
            {[
              "Share your code or link via WhatsApp, SMS, or copy",
              "Friend signs up with your referral code",
              "They verify email/phone (OTP screen)",
              `You both get $${reward} wallet credit instantly`,
            ].map((t, i) => (
              <View key={t} style={styles.step}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{t}</Text>
              </View>
            ))}
          </View>

          {/* Recent invites */}
          {data?.recent && data.recent.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Recent invites</Text>
              {data.recent.map((r) => (
                <View key={r.id} style={styles.recentRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recentName}>
                      {r.referredUser?.name || "User"}
                    </Text>
                    <Text style={styles.recentMeta}>
                      {r.referredUser?.email || "—"}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.badge,
                      r.status === "completed"
                        ? styles.badgeOk
                        : styles.badgePending,
                    ]}
                  >
                    <Text style={styles.badgeText}>{r.status}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          <View style={{ marginTop: 8, marginBottom: 28, gap: 10 }}>
            <GradientButton
              label="Share Invite"
              onPress={shareInvite}
              loading={sharing}
            />
            <GradientButton
              label="View VIP Plans"
              onPress={() => navigation.navigate("TeamRank")}
            />
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
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
  hero: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 20,
    marginBottom: 12,
  },
  earnLabel: { fontSize: 13, color: colors.muted },
  earn: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.text,
    marginTop: 4,
  },
  earnSub: { marginTop: 6, fontSize: 13, color: colors.muted, lineHeight: 18 },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 14,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },
  statLabel: {
    marginTop: 4,
    fontSize: 11,
    color: colors.muted,
    fontWeight: "600",
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
    marginBottom: 12,
  },
  label: { fontSize: 13, color: colors.muted, marginBottom: 8 },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  code: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: 1.5,
  },
  copy: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  copyText: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  linkLabel: {
    marginTop: 14,
    fontSize: 12,
    color: colors.muted,
    marginBottom: 4,
  },
  link: { fontSize: 13, color: "#9BB0FF", lineHeight: 18 },
  copyLinkBtn: { marginTop: 10, alignSelf: "flex-start" },
  copyLinkText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 13,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  stepNum: {
    height: 24,
    width: 24,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: { color: colors.primary, fontWeight: "700", fontSize: 12 },
  stepText: { flex: 1, color: colors.muted, fontSize: 14, lineHeight: 20 },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: 10,
  },
  recentName: { fontSize: 14, fontWeight: "600", color: colors.text },
  recentMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeOk: { backgroundColor: "rgba(0,208,132,0.15)" },
  badgePending: { backgroundColor: "rgba(245,165,36,0.15)" },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text,
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
