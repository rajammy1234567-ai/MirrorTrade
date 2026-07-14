import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Screen from "../components/Screen";
import GradientButton from "../components/GradientButton";
import RangeSlider from "../components/RangeSlider";
import PnlText from "../components/PnlText";
import { traders } from "../data/mock";
import { useAppData } from "../context/AppDataContext";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "CopySetup">;

export default function CopySetupScreen({ route, navigation }: Props) {
  const trader = traders.find((t) => t.id === route.params.traderId) || traders[0];
  const { startCopy } = useAppData();
  const [amount, setAmount] = useState(500);
  const [maxDd, setMaxDd] = useState(20);
  const [multiplier, setMultiplier] = useState(1);
  const [copyOpen, setCopyOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <Screen
      footer={
        <GradientButton
          variant="green"
          label={`Start Copying · $${amount.toLocaleString()} USDT`}
          loading={loading}
          onPress={async () => {
            try {
              setLoading(true);
              const { startCopyRequest } = require("../config/api");
              await startCopyRequest(trader.id, amount, maxDd, multiplier, copyOpen);

              startCopy({
                traderId: trader.id,
                amount,
                maxDd,
                multiplier,
                copyOpen,
              });
              Alert.alert(
                "Copy started",
                `You are now copying ${trader.name} with $${amount}. (Dummy API Success)`,
                [{ text: "OK", onPress: () => navigation.navigate("MainTabs") }]
              );
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to connect to API");
            } finally {
              setLoading(false);
            }
          }}
        />
      }
    >
      <View style={styles.nav}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={18} color={colors.text} />
        </Pressable>
        <Text style={styles.navTitle}>Setup Copy Trading</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.traderCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{trader.avatar}</Text>
        </View>
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={styles.traderName}>{trader.name}</Text>
          <View style={styles.traderStats}>
            <PnlText value={trader.roi30d} suffix="% ROI" size="sm" />
            <Text style={styles.dot}>·</Text>
            <Text style={styles.winRate}>{trader.winRate}% Win Rate</Text>
          </View>
        </View>
      </View>

      {/* Investment */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>INVESTMENT AMOUNT</Text>
        <View style={styles.amountRow}>
          <Text style={styles.amount}>${amount.toLocaleString()}</Text>
          <Text style={styles.usdt}>USDT</Text>
        </View>
        <RangeSlider
          value={amount}
          min={100}
          max={5000}
          onChange={setAmount}
          trackColor={colors.primary}
          thumbColor={colors.primary}
        />
        <View style={styles.sliderLabels}>
          <Text style={styles.sliderLabel}>$100</Text>
          <Text style={styles.sliderLabel}>$1,000</Text>
          <Text style={styles.sliderLabel}>$2,500</Text>
          <Text style={styles.sliderLabel}>$5,000</Text>
        </View>
      </View>

      {/* Risk */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>RISK SETTINGS</Text>

        <View style={styles.riskRow}>
          <Text style={styles.riskName}>Max Drawdown Stop</Text>
          <Text style={styles.ddValue}>-{maxDd}%</Text>
        </View>
        <RangeSlider
          value={maxDd}
          min={5}
          max={50}
          onChange={setMaxDd}
          trackColor={colors.loss}
          thumbColor={colors.loss}
        />

        <View style={[styles.riskRow, { marginTop: 18 }]}>
          <Text style={styles.riskName}>Position Size Multiplier</Text>
          <Text style={styles.multValue}>{multiplier}x</Text>
        </View>
        <RangeSlider
          value={multiplier}
          min={1}
          max={5}
          onChange={setMultiplier}
          trackColor={colors.primary}
          thumbColor={colors.primary}
        />
      </View>

      {/* Toggle */}
      <View style={styles.toggleCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.toggleTitle}>Copy Open Positions</Text>
          <Text style={styles.toggleSub}>Include trader&apos;s current trades</Text>
        </View>
        <Switch
          value={copyOpen}
          onValueChange={setCopyOpen}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor="#FFFFFF"
        />
      </View>

      {/* Summary */}
      <View style={styles.summary}>
        <Text style={styles.cardLabel}>ORDER SUMMARY</Text>
        <Row label="Investment" value={`$${amount.toLocaleString()} USDT`} />
        <Row label="Commission" value="10% of profit" />
        <Row label="Drawdown stop" value={`-${maxDd}%`} danger />
        <Row label="Size multiplier" value={`${multiplier}x`} />
      </View>
    </Screen>
  );
}

function Row({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <View style={styles.sumRow}>
      <Text style={styles.sumLabel}>{label}</Text>
      <Text style={[styles.sumValue, danger && { color: colors.loss }]}>
        {value}
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
  traderCard: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
  },
  avatar: {
    height: 46,
    width: 46,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 15, fontWeight: "700", color: colors.primary },
  traderName: { fontSize: 16, fontWeight: "700", color: colors.text },
  traderStats: { marginTop: 4, flexDirection: "row", alignItems: "center" },
  dot: { marginHorizontal: 6, color: colors.muted },
  winRate: { fontSize: 12, color: colors.profit, fontWeight: "600" },
  card: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: colors.muted,
    marginBottom: 10,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    marginBottom: 16,
  },
  amount: {
    fontSize: 40,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.5,
  },
  usdt: {
    marginLeft: 8,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "600",
    color: colors.muted,
  },
  sliderLabels: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sliderLabel: { fontSize: 11, color: colors.muted },
  riskRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  riskName: { fontSize: 14, color: colors.text, fontWeight: "500" },
  ddValue: { fontSize: 14, fontWeight: "700", color: colors.loss },
  multValue: { fontSize: 14, fontWeight: "700", color: colors.primary },
  toggleCard: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
  },
  toggleTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  toggleSub: { marginTop: 3, fontSize: 12, color: colors.muted },
  summary: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
  },
  sumRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sumLabel: { fontSize: 13, color: colors.muted },
  sumValue: { fontSize: 13, fontWeight: "600", color: colors.text },
});
