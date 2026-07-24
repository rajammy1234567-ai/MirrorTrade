import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import Screen from "../components/Screen";
import GradientButton from "../components/GradientButton";
import {
  createWithdrawRequestApi,
  getApiErrorMessage,
  getWithdrawableRequest,
  listMyWithdrawalsRequest,
  type WithdrawRequestRow,
} from "../config/api";
import { formatMoney } from "../config/currency";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Withdraw">;

export default function WithdrawScreen({ navigation }: Props) {
  const [withdrawable, setWithdrawable] = useState(0);
  const [usdtBalance, setUsdtBalance] = useState(0);
  const [note, setNote] = useState("");
  const [history, setHistory] = useState<WithdrawRequestRow[]>([]);
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [wRes, hRes] = await Promise.all([
        getWithdrawableRequest(),
        listMyWithdrawalsRequest(15),
      ]);
      if (wRes.success) {
        setWithdrawable(wRes.data.withdrawable);
        setUsdtBalance(wRes.data.usdtBalance);
        setNote(wRes.data.note);
      }
      if (hRes.success) setHistory(hRes.data);
    } catch (err) {
      Alert.alert("Error", getApiErrorMessage(err, "Failed to load withdraw"));
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

  const onSubmit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      Alert.alert("Invalid amount", "Enter earnings amount to withdraw");
      return;
    }
    if (amt > withdrawable) {
      Alert.alert(
        "Not enough earnings",
        `Withdrawable: ${formatMoney(withdrawable)} USDT\nDeposit USDT cannot be withdrawn.`
      );
      return;
    }
    if (!address.trim() || address.trim().length < 10) {
      Alert.alert("Address required", "Enter your BNB / USDT payout address");
      return;
    }

    setSubmitting(true);
    try {
      const res = await createWithdrawRequestApi({
        amount: amt,
        payoutAddress: address.trim(),
      });
      Alert.alert("Submitted", res.message);
      setAmount("");
      await load();
    } catch (err) {
      Alert.alert("Withdraw failed", getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen edges={["top", "bottom", "left", "right"]} scroll={false} padded={false}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
          <Text style={styles.headerTitle}>Withdraw earnings</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.balCard}>
            <Text style={styles.balLabel}>Withdrawable earnings</Text>
            <Text style={styles.balValue}>
              {formatMoney(withdrawable, { decimals: 2 })} USDT
            </Text>
            <Text style={styles.balHint}>
              From referrals, bonuses & profit share after level purchase
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <Text style={styles.infoText}>
              {note ||
                "Only app earnings can be withdrawn. Your deposit USDT balance is for buying VIP levels only."}
            </Text>
          </View>

          <View style={styles.split}>
            <View style={styles.splitBox}>
              <Text style={styles.splitLabel}>Deposit USDT</Text>
              <Text style={styles.splitVal}>
                {formatMoney(usdtBalance, { decimals: 2 })}
              </Text>
              <Text style={styles.splitSub}>Not withdrawable</Text>
            </View>
            <View style={styles.splitBox}>
              <Text style={styles.splitLabel}>Earnings</Text>
              <Text style={[styles.splitVal, { color: colors.profit }]}>
                {formatMoney(withdrawable, { decimals: 2 })}
              </Text>
              <Text style={styles.splitSub}>Withdrawable</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Request withdraw</Text>
            <Text style={styles.fieldLabel}>Amount (USDT)</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.muted}
              value={amount}
              onChangeText={setAmount}
            />
            <Pressable
              onPress={() => setAmount(String(withdrawable))}
              style={{ alignSelf: "flex-end", marginTop: 6 }}
            >
              <Text style={styles.max}>Max</Text>
            </Pressable>

            <Text style={[styles.fieldLabel, { marginTop: 8 }]}>
              Payout address (BNB / USDT BEP-20)
            </Text>
            <TextInput
              style={styles.input}
              placeholder="0x..."
              placeholderTextColor={colors.muted}
              value={address}
              onChangeText={setAddress}
              autoCapitalize="none"
            />

            <GradientButton
              label={submitting ? "Submitting…" : "Submit withdraw"}
              onPress={onSubmit}
              disabled={submitting || withdrawable <= 0}
              style={{ marginTop: 16 }}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>History</Text>
            {history.length === 0 ? (
              <Text style={styles.hint}>No withdrawals yet</Text>
            ) : (
              history.map((w) => (
                <View key={w.id} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>
                      {formatMoney(w.amount, { decimals: 2 })} {w.currency}
                    </Text>
                    <Text style={styles.rowSub}>
                      {w.status} · {new Date(w.createdAt).toLocaleString()}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.badge,
                      w.status === "paid" && { color: colors.profit },
                      w.status === "rejected" && { color: colors.loss },
                    ]}
                  >
                    {w.status}
                  </Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
  body: { padding: 16, paddingBottom: 40, gap: 14 },
  balCard: {
    backgroundColor: colors.elevated,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  balLabel: { color: colors.muted, fontSize: 13 },
  balValue: { color: colors.profit, fontSize: 28, fontWeight: "800", marginTop: 4 },
  balHint: { color: colors.muted, fontSize: 12, marginTop: 6 },
  infoCard: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "rgba(247,166,0,0.08)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(247,166,0,0.25)",
  },
  infoText: { flex: 1, color: colors.muted, fontSize: 12, lineHeight: 17 },
  split: { flexDirection: "row", gap: 10 },
  splitBox: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  splitLabel: { color: colors.muted, fontSize: 11 },
  splitVal: { color: colors.text, fontSize: 18, fontWeight: "700", marginTop: 4 },
  splitSub: { color: colors.muted, fontSize: 10, marginTop: 4 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: "700", marginBottom: 10 },
  fieldLabel: { color: colors.muted, fontSize: 12, marginBottom: 6 },
  input: {
    backgroundColor: colors.elevated,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  max: { color: colors.primary, fontWeight: "700", fontSize: 12 },
  hint: { color: colors.muted, fontSize: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowTitle: { color: colors.text, fontWeight: "600" },
  rowSub: { color: colors.muted, fontSize: 11, marginTop: 2 },
  badge: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
});
