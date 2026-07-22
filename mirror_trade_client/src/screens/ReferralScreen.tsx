import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Screen from "../components/Screen";
import GradientButton from "../components/GradientButton";
import { getMyPlanStatusRequest, type PlanStatus } from "../config/api";
import { formatMoney } from "../config/currency";
import { useAuth } from "../context/AuthContext";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Referral">;

export default function ReferralScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [status, setStatus] = useState<PlanStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getMyPlanStatusRequest();
        if (res.success) setStatus(res.data);
      } catch {
        // fall back to auth user fields
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const code =
    status?.referralCode || user?.referralCode || "Login to get your code";
  const directs = status?.directs ?? 0;
  const teamBusiness = status?.teamBusiness ?? 0;
  const wallet = status?.walletBalance ?? user?.walletBalance ?? 0;

  return (
    <Screen>
      <View style={styles.nav}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={18} color={colors.text} />
        </Pressable>
        <Text style={styles.navTitle}>Referral program</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <>
          <View style={styles.hero}>
            <Text style={styles.earnLabel}>Wallet balance</Text>
            <Text style={styles.earn}>{formatMoney(wallet, { decimals: 2 })}</Text>
            <Text style={styles.earnSub}>
              {directs} direct referrals · Team business{" "}
              {formatMoney(teamBusiness, { decimals: 0 })}
            </Text>
            <View style={styles.rankRow}>
              <View style={styles.rankChip}>
                <Text style={styles.rankChipText}>
                  {status?.tVipRank || user?.tVipRank || "T-VIP"}
                </Text>
              </View>
              <View style={[styles.rankChip, styles.rankChipGold]}>
                <Text style={[styles.rankChipText, { color: "#F7A600" }]}>
                  {status?.cVipRank || user?.cVipRank || "C-VIP"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Your code</Text>
            <View style={styles.codeRow}>
              <Text style={styles.code}>{code}</Text>
              <Pressable
                style={styles.copy}
                onPress={() => Alert.alert("Referral code", code)}
              >
                <Text style={styles.copyText}>Copy</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>How it works</Text>
            {[
              "Share your code with friends",
              "They sign up with your referral code",
              "Their deposits grow your C-VIP team business",
              "You earn T-VIP profit share + C-VIP bonuses",
            ].map((t, i) => (
              <View key={t} style={styles.step}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{t}</Text>
              </View>
            ))}
          </View>

          <View style={{ marginTop: 16, gap: 10 }}>
            <GradientButton
              label="View VIP Plans"
              onPress={() => navigation.navigate("TeamRank")}
            />
            <GradientButton
              label="Share invite"
              onPress={() =>
                Alert.alert(
                  "Invite",
                  `Share your code: ${code}\n\nFriends enter it on Sign Up.`
                )
              }
            />
          </View>
        </>
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
  earnSub: { marginTop: 6, fontSize: 13, color: colors.muted },
  rankRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  rankChip: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rankChipGold: {
    backgroundColor: "rgba(247,166,0,0.12)",
  },
  rankChipText: {
    color: "#9BB0FF",
    fontWeight: "700",
    fontSize: 12,
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
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: 1,
  },
  copy: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  copyText: { color: colors.primary, fontWeight: "700", fontSize: 13 },
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
});
