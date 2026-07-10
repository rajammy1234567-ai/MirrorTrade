import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Screen from "../components/Screen";
import GradientButton from "../components/GradientButton";
import { useAppData } from "../context/AppDataContext";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Signals">;

export default function SignalsScreen({ navigation }: Props) {
  const { signals, executeSignal, settings } = useAppData();

  const onExecute = (id: string, pair: string, direction: string) => {
    const run = () => {
      const pos = executeSignal(id);
      if (pos) {
        Alert.alert(
          "Signal executed",
          `${pair} ${direction.toUpperCase()} is now an open position.`,
          [
            {
              text: "View portfolio",
              onPress: () => navigation.navigate("MainTabs"),
            },
            { text: "OK" },
          ]
        );
      }
    };

    if (settings.confirmOrders) {
      Alert.alert("Execute signal", `Open ${pair} ${direction}?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Execute", onPress: run },
      ]);
    } else {
      run();
    }
  };

  return (
    <Screen>
      <View style={styles.nav}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={18} color={colors.text} />
        </Pressable>
        <Text style={styles.navTitle}>Signal Feed</Text>
        <View style={{ width: 36 }} />
      </View>

      <Text style={styles.sub}>
        Live setups from providers · tap Execute to open a position
      </Text>

      <View style={styles.list}>
        {signals.map((s) => {
          const long = s.direction === "long";
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
                  label="Execute"
                  size="sm"
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
  sub: { marginTop: 12, fontSize: 13, color: colors.muted },
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
