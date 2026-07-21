import React from "react";
import { StyleSheet, Text, View, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Screen from "../components/Screen";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "TeamRank">;

export default function TeamRankScreen({ navigation }: Props) {
  // Mock data for Team Rank & Income Plan
  const userStats = {
    totalDeposit: 2500,
    walletBalance: 420.50,
    tVipRank: "T-VIP 2",
    cVipRank: "C-VIP 1",
    teamBusiness: 12500,
    referralCode: "MIRROR-X9A2",
    directReferrals: 12,
  };

  const recentPayouts = [
    { id: "1", date: "2026-07-20", amount: 45.5, type: "T-VIP Bonus" },
    { id: "2", date: "2026-07-19", amount: 12.0, type: "Direct Bonus" },
    { id: "3", date: "2026-07-15", amount: 80.0, type: "C-VIP Bonus" },
  ];

  return (
    <Screen edges={["top", "bottom", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
          <Text style={styles.headerTitle}>Team & Ranks</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardLabel}>Wallet Balance</Text>
          <Text style={styles.cardValue}>${userStats.walletBalance.toFixed(2)}</Text>
          <View style={styles.divider} />
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Personal Deposit</Text>
              <Text style={styles.statSubValue}>${userStats.totalDeposit}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Team Business</Text>
              <Text style={styles.statSubValue}>${userStats.teamBusiness}</Text>
            </View>
          </View>
        </View>

        <View style={styles.ranksRow}>
          <View style={[styles.rankBox, { backgroundColor: "#F0F5FF" }]}>
            <Ionicons name="trophy-outline" size={24} color="#2562FF" />
            <Text style={styles.rankTitle}>T-VIP</Text>
            <Text style={[styles.rankValue, { color: "#2562FF" }]}>{userStats.tVipRank}</Text>
          </View>
          <View style={[styles.rankBox, { backgroundColor: "#FFF4E5" }]}>
            <Ionicons name="star-outline" size={24} color="#F7A600" />
            <Text style={styles.rankTitle}>C-VIP</Text>
            <Text style={[styles.rankValue, { color: "#F7A600" }]}>{userStats.cVipRank}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invite Friends</Text>
          <View style={styles.inviteBox}>
            <Text style={styles.inviteLabel}>Your Referral Code</Text>
            <View style={styles.codeRow}>
              <Text style={styles.codeText}>{userStats.referralCode}</Text>
              <Ionicons name="copy-outline" size={20} color={colors.text} />
            </View>
            <Text style={styles.inviteSub}>{userStats.directReferrals} Direct Referrals</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Payouts</Text>
          {recentPayouts.map(payout => (
            <View key={payout.id} style={styles.payoutRow}>
              <View>
                <Text style={styles.payoutType}>{payout.type}</Text>
                <Text style={styles.payoutDate}>{payout.date}</Text>
              </View>
              <Text style={styles.payoutAmount}>+${payout.amount.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 14,
    color: colors.muted,
  },
  cardValue: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.text,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statBox: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 4,
  },
  statSubValue: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  ranksRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  rankBox: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  rankTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginTop: 8,
  },
  rankValue: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  inviteBox: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inviteLabel: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 8,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  codeText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    letterSpacing: 1,
  },
  inviteSub: {
    fontSize: 12,
    color: colors.profit,
    fontWeight: "500",
  },
  payoutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  payoutType: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  payoutDate: {
    fontSize: 12,
    color: colors.muted,
  },
  payoutAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.profit,
  },
});
