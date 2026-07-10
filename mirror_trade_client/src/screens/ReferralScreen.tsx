import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Screen from "../components/Screen";
import GradientButton from "../components/GradientButton";
import { useAuth } from "../context/AuthContext";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Referral">;

export default function ReferralScreen({ navigation }: Props) {
  const { user } = useAuth();
  const code = `REF-${(user?.name || "USER").slice(0, 4).toUpperCase()}2025`;

  return (
    <Screen>
      <View style={styles.nav}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={18} color={colors.text} />
        </Pressable>
        <Text style={styles.navTitle}>Referral program</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.hero}>
        <Text style={styles.earnLabel}>This month</Text>
        <Text style={styles.earn}>$128.40</Text>
        <Text style={styles.earnSub}>8 successful referrals · 20% fee share</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Your code</Text>
        <View style={styles.codeRow}>
          <Text style={styles.code}>{code}</Text>
          <Pressable
            style={styles.copy}
            onPress={() => Alert.alert("Copied", code)}
          >
            <Text style={styles.copyText}>Copy</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>How it works</Text>
        {[
          "Share your code with friends",
          "They sign up & connect an exchange",
          "You earn 20% of their platform fees",
        ].map((t, i) => (
          <View key={t} style={styles.step}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{i + 1}</Text>
            </View>
            <Text style={styles.stepText}>{t}</Text>
          </View>
        ))}
      </View>

      <View style={{ marginTop: 16 }}>
        <GradientButton
          label="Share invite link"
          onPress={() =>
            Alert.alert(
              "Invite link",
              `https://mirrortrade.app/r/${code}\n\nLink copied (demo).`
            )
          }
        />
      </View>
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
  earnLabel: { fontSize: 12, color: colors.muted, fontWeight: "600" },
  earn: {
    marginTop: 6,
    fontSize: 36,
    fontWeight: "700",
    color: colors.text,
  },
  earnSub: { marginTop: 6, fontSize: 13, color: colors.muted },
  card: {
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
  },
  label: { fontSize: 12, color: colors.muted, marginBottom: 10 },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.elevated,
    borderRadius: 12,
    padding: 12,
  },
  code: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: 0.5,
  },
  copy: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  copyText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  step: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  stepNum: {
    height: 28,
    width: 28,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  stepText: { flex: 1, marginLeft: 12, fontSize: 13, color: colors.muted },
});
