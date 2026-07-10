import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Screen from "../components/Screen";
import AuthInput from "../components/AuthInput";
import GradientButton from "../components/GradientButton";
import { exchanges } from "../data/mock";
import { useAuth } from "../context/AuthContext";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "ExchangeConnect">;

export default function ExchangeConnectScreen({ navigation }: Props) {
  const { setExchangeConnected, completeOnboarding } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [tradeOnly, setTradeOnly] = useState(true);

  const finish = async (connected: boolean) => {
    await setExchangeConnected(connected);
    await completeOnboarding();
    navigation.replace("MainTabs");
  };

  return (
    <Screen edges={["top", "bottom", "left", "right"]}>
      <View style={styles.topRow}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: step === 1 ? "50%" : "100%" }]} />
        </View>
        <Pressable onPress={() => finish(false)}>
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      <Text style={styles.title}>
        {step === 1 ? "Connect Exchange" : "API Credentials"}
      </Text>
      <Text style={styles.sub}>
        {step === 1
          ? "Select your exchange to get started"
          : `Paste your ${exchanges.find((e) => e.id === selected)?.name || ""} API key and secret.`}
      </Text>

      {step === 1 ? (
        <View style={styles.list}>
          {exchanges.map((ex) => {
            const active = selected === ex.id;
            return (
              <Pressable
                key={ex.id}
                onPress={() => setSelected(ex.id)}
                style={[styles.exCard, active && styles.exCardActive]}
              >
                <View
                  style={[styles.exIcon, { backgroundColor: `${ex.color}22` }]}
                >
                  <Text style={[styles.exShort, { color: ex.color }]}>
                    {ex.short.slice(0, 3)}
                  </Text>
                </View>
                <View style={styles.exMid}>
                  <Text style={styles.exName}>{ex.name}</Text>
                  <Text style={styles.exDesc}>{ex.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            );
          })}

          <View style={styles.safeBox}>
            <Ionicons name="shield-checkmark" size={20} color={colors.profit} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.safeTitle}>Trade-Only Access Guaranteed</Text>
              <Text style={styles.safeBody}>
                We only request read & trade permissions. Withdrawal access is
                never enabled — your funds always stay safe.
              </Text>
            </View>
          </View>

          <GradientButton
            label="Continue"
            onPress={() => selected && setStep(2)}
            disabled={!selected}
          />
        </View>
      ) : (
        <View style={styles.list}>
          <AuthInput
            icon="key-outline"
            placeholder="API Key"
            value={apiKey}
            onChangeText={setApiKey}
          />
          <AuthInput
            icon="lock-closed-outline"
            placeholder="API Secret"
            value={apiSecret}
            onChangeText={setApiSecret}
            secureTextEntry
          />

          <Pressable
            onPress={() => setTradeOnly((v) => !v)}
            style={styles.checkRow}
          >
            <Ionicons
              name={tradeOnly ? "checkbox" : "square-outline"}
              size={20}
              color={tradeOnly ? colors.profit : colors.muted}
            />
            <Text style={styles.checkText}>
              Trade-only permission, no withdrawal access
            </Text>
          </Pressable>

          <View style={styles.warnBox}>
            <Text style={styles.warnTitle}>Permission checklist</Text>
            <Text style={styles.warnBody}>
              Enable: Spot/Futures trading · Read balances. Disable: Withdrawals,
              Transfer, Universal Transfer.
            </Text>
          </View>

          <GradientButton
            label="Connect Exchange"
            onPress={() => finish(true)}
            disabled={!apiKey || !apiSecret || !tradeOnly}
          />
          <Pressable onPress={() => setStep(1)} style={styles.backBtn}>
            <Text style={styles.backText}>Back to exchanges</Text>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  skip: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  title: {
    marginTop: 20,
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
  },
  sub: {
    marginTop: 6,
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
  list: { marginTop: 22, gap: 12 },
  exCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
  },
  exCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  exIcon: {
    height: 46,
    width: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  exShort: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  exMid: { flex: 1, marginLeft: 12 },
  exName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  exDesc: {
    marginTop: 2,
    fontSize: 12,
    color: colors.muted,
  },
  safeBox: {
    marginTop: 8,
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,208,132,0.3)",
    backgroundColor: "rgba(0,208,132,0.08)",
    padding: 14,
  },
  safeTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.profit,
  },
  safeBody: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
  },
  checkText: {
    marginLeft: 10,
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },
  warnBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,59,92,0.25)",
    backgroundColor: "rgba(255,59,92,0.08)",
    padding: 14,
  },
  warnTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.loss,
  },
  warnBody: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted,
  },
  backBtn: { alignItems: "center", paddingVertical: 8 },
  backText: { fontSize: 13, color: colors.muted },
});
