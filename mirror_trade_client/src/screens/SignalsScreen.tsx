import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Screen from "../components/Screen";
import GradientButton from "../components/GradientButton";
import { getApiErrorMessage } from "../config/api";
import { useAppData } from "../context/AppDataContext";
import { useAuth } from "../context/AuthContext";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Signals">;

export default function SignalsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const {
    signals,
    signalsLoading,
    refreshSignals,
    executeSignal,
    settings,
  } = useAppData();
  const [executingId, setExecutingId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refreshSignals();
    }, [refreshSignals])
  );

  const onExecute = (id: string, pair: string, direction: string) => {
    if (!user) {
      Alert.alert("Login required", "Sign in to execute signals on the server.", [
        { text: "Cancel", style: "cancel" },
        { text: "Login", onPress: () => navigation.navigate("Auth") },
      ]);
      return;
    }

    const run = async (selectedAmount: number) => {
      setExecutingId(id);
      try {
        const pos = await executeSignal(id, selectedAmount);
        if (pos) {
          Alert.alert(
            "Signal Executed!",
            `${pair} ${direction.toUpperCase()} opened ($${selectedAmount} USDT) with live Binance marks. Track PnL in your portfolio.`,
            [
              {
                text: "View Portfolio",
                onPress: () => navigation.navigate("MainTabs"),
              },
              { text: "OK" },
            ]
          );
        }
      } catch (err) {
        Alert.alert("Execute failed", getApiErrorMessage(err));
      } finally {
        setExecutingId(null);
      }
    };

    Alert.alert(
      `Execute ${pair} (${direction.toUpperCase()})`,
      "Choose position allocation in USDT:",
      [
        { text: "Cancel", style: "cancel" },
        { text: "$25", onPress: () => void run(25) },
        { text: "$50", onPress: () => void run(50) },
        { text: "$100", onPress: () => void run(100) },
        { text: "$250", onPress: () => void run(250) },
      ]
    );
  };

  return (
    <Screen tabScreen>
      <View style={styles.nav}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={18} color={colors.text} />
        </Pressable>
        <Text style={styles.navTitle}>Signal Feed</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.demoBanner}>
        <Ionicons name="flask-outline" size={15} color="#FBBF24" />
        <Text style={styles.demoBannerText}>
          API signal feed · execute opens paper positions in Portfolio
        </Text>
      </View>

      <Text style={styles.sub}>
        Setups from the MirrorTrade API · Execute mirrors into your portfolio book
      </Text>

      {signalsLoading && signals.length === 0 ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
      ) : null}

      {!signalsLoading && signals.length === 0 ? (
        <Text style={styles.empty}>No active signals right now</Text>
      ) : null}

      <View style={styles.list}>
        {signals.map((s) => {
          const long = s.direction === "long";
          const busy = executingId === s.id;
          return (
            <View key={s.id} style={styles.card}>
              <View style={styles.top}>
                <View>
                  <Text style={styles.provider}>{s.provider}</Text>
                  <Text style={styles.time}>{s.time}</Text>
                </View>
                <View
                  style={[
                    styles.dir,
                    {
                      backgroundColor: long
                        ? "rgba(0,208,132,0.12)"
                        : "rgba(255,59,92,0.12)",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dirText,
                      { color: long ? colors.profit : colors.loss },
                    ]}
                  >
                    {s.direction.toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={styles.pair}>{s.pair}</Text>

              <View style={styles.levels}>
                <Level label="Entry" value={s.entry} />
                <Level label="Target" value={s.target} color={colors.profit} />
                <Level label="Stop" value={s.stopLoss} color={colors.loss} />
              </View>

              <View style={{ marginTop: 12 }}>
                <GradientButton
                  label={busy ? "Executing…" : "Execute"}
                  size="sm"
                  disabled={busy}
                  onPress={() => onExecute(s.id, s.pair, s.direction)}
                />
              </View>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

function Level({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <View>
      <Text style={styles.levelLabel}>{label}</Text>
      <Text style={[styles.levelVal, color ? { color } : null]}>
        {value.toLocaleString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  demoBanner: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.35)",
    backgroundColor: "rgba(251,191,36,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  demoBannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    color: "#FCD34D",
    fontWeight: "500",
  },
  sub: { marginTop: 12, fontSize: 13, color: colors.muted },
  empty: {
    marginTop: 24,
    textAlign: "center",
    fontSize: 13,
    color: colors.muted,
  },
  list: { marginTop: 16, gap: 12 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  provider: { fontSize: 14, fontWeight: "700", color: colors.text },
  time: { marginTop: 2, fontSize: 12, color: colors.muted },
  dir: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  dirText: { fontSize: 11, fontWeight: "800" },
  pair: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  levels: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  levelLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: colors.muted,
    textTransform: "uppercase",
  },
  levelVal: {
    marginTop: 3,
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
});
