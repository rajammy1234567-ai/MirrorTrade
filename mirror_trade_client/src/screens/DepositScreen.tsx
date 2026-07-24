import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import Screen from "../components/Screen";
import GradientButton from "../components/GradientButton";
import {
  createDepositRequestApi,
  getApiErrorMessage,
  getDepositInfoRequest,
  getWalletRequest,
  listMyDepositsRequest,
  type DepositInfo,
  type DepositRequestRow,
  type WalletSnapshot,
} from "../config/api";
import { formatMoney } from "../config/currency";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Deposit">;

export default function DepositScreen({ navigation }: Props) {
  const [info, setInfo] = useState<DepositInfo | null>(null);
  const [wallet, setWallet] = useState<WalletSnapshot | null>(null);
  const [history, setHistory] = useState<DepositRequestRow[]>([]);
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [infoRes, walletRes, histRes] = await Promise.all([
        getDepositInfoRequest(),
        getWalletRequest(),
        listMyDepositsRequest(10),
      ]);
      if (infoRes.success) setInfo(infoRes.data);
      if (walletRes.success) setWallet(walletRes.data);
      if (histRes.success) setHistory(histRes.data);
    } catch (err) {
      Alert.alert("Error", getApiErrorMessage(err, "Failed to load deposit info"));
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

  const address = info?.address || "";
  const qrUrl = address
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
        info?.qrPayload || address
      )}`
    : null;

  const copyAddress = async () => {
    if (!address) return;
    await Clipboard.setStringAsync(address);
    Alert.alert("Copied", "BNB deposit address copied");
  };

  const onSubmit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      Alert.alert("Invalid amount", "Enter USDT amount you want credited");
      return;
    }
    const min = info?.minDepositUsdt ?? 10;
    if (amt < min) {
      Alert.alert("Too small", `Minimum deposit is ${formatMoney(min)} USDT`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await createDepositRequestApi({
        amountUsdt: amt,
        txHash: txHash.trim() || undefined,
        amountBnb:
          info?.bnbToUsdtRate && info.bnbToUsdtRate > 0
            ? Math.round((amt / info.bnbToUsdtRate) * 1e6) / 1e6
            : undefined,
      });
      Alert.alert(
        res.data.autoCredited ? "Deposit credited" : "Request submitted",
        res.message
      );
      setAmount("");
      setTxHash("");
      await load();
    } catch (err) {
      Alert.alert("Deposit failed", getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const bnbNeeded =
    amount && info?.bnbToUsdtRate
      ? (Number(amount) / info.bnbToUsdtRate).toFixed(6)
      : null;

  return (
    <Screen edges={["top", "bottom", "left", "right"]} scroll={false} padded={false}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
          <Text style={styles.headerTitle}>Deposit BNB → USDT</Text>
        </Pressable>
      </View>

      {loading && !info ? (
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
            <Text style={styles.balLabel}>Your USDT balance</Text>
            <Text style={styles.balValue}>
              {formatMoney(wallet?.usdtBalance ?? 0, { decimals: 2 })} USDT
            </Text>
            <Text style={styles.balHint}>
              Use this balance to buy T-VIP / C-VIP levels
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Scan QR to deposit {info?.coin || "BNB"}</Text>
            <Text style={styles.network}>
              Network: {info?.network || "BSC (BEP-20)"}
            </Text>

            {qrUrl ? (
              <View style={styles.qrWrap}>
                <Image source={{ uri: qrUrl }} style={styles.qr} />
              </View>
            ) : (
              <Text style={styles.warn}>Deposit address not configured</Text>
            )}

            <Text style={styles.addrLabel}>Deposit address</Text>
            <Pressable style={styles.addrBox} onPress={copyAddress}>
              <Text style={styles.addrText} selectable>
                {address || "—"}
              </Text>
              <Ionicons name="copy-outline" size={18} color={colors.primary} />
            </Pressable>

            {info?.bnbToUsdtRate ? (
              <Text style={styles.rate}>
                Rate: 1 BNB ≈ {formatMoney(info.bnbToUsdtRate)} USDT
              </Text>
            ) : null}
            <Text style={styles.note}>{info?.note}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Confirm your deposit</Text>
            <Text style={styles.fieldLabel}>USDT amount to credit</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="e.g. 100"
              placeholderTextColor={colors.muted}
              value={amount}
              onChangeText={setAmount}
            />
            {bnbNeeded && Number(amount) > 0 ? (
              <Text style={styles.hint}>≈ {bnbNeeded} BNB to send</Text>
            ) : null}

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
              Transaction hash (optional)
            </Text>
            <TextInput
              style={styles.input}
              placeholder="0x..."
              placeholderTextColor={colors.muted}
              value={txHash}
              onChangeText={setTxHash}
              autoCapitalize="none"
            />

            <GradientButton
              label={submitting ? "Submitting…" : "Submit deposit"}
              onPress={onSubmit}
              disabled={submitting}
              style={{ marginTop: 16 }}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recent deposits</Text>
            {history.length === 0 ? (
              <Text style={styles.hint}>No deposits yet</Text>
            ) : (
              history.map((d) => (
                <View key={d.id} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>
                      {formatMoney(d.amountUsdt, { decimals: 2 })} USDT
                    </Text>
                    <Text style={styles.rowSub}>
                      {d.status} · {new Date(d.createdAt).toLocaleString()}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.badge,
                      d.status === "credited" && { color: colors.profit },
                      d.status === "rejected" && { color: colors.loss },
                    ]}
                  >
                    {d.status}
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
  header: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
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
  balValue: { color: colors.text, fontSize: 28, fontWeight: "800", marginTop: 4 },
  balHint: { color: colors.muted, fontSize: 12, marginTop: 6 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: "700", marginBottom: 8 },
  network: { color: colors.primary, fontSize: 13, marginBottom: 12 },
  qrWrap: {
    alignSelf: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  qr: { width: 200, height: 200 },
  addrLabel: { color: colors.muted, fontSize: 12, marginBottom: 6 },
  addrBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.elevated,
    borderRadius: 10,
    padding: 12,
  },
  addrText: { flex: 1, color: colors.text, fontSize: 12 },
  rate: { color: colors.muted, fontSize: 12, marginTop: 10 },
  note: { color: colors.muted, fontSize: 11, marginTop: 8, lineHeight: 16 },
  warn: { color: colors.loss, marginVertical: 12 },
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
  hint: { color: colors.muted, fontSize: 12, marginTop: 6 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowTitle: { color: colors.text, fontWeight: "600" },
  rowSub: { color: colors.muted, fontSize: 11, marginTop: 2 },
  badge: { color: colors.primary, fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
});
