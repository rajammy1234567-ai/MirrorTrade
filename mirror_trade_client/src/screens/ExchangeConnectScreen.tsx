import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import Screen from "../components/Screen";
import AuthInput from "../components/AuthInput";
import GradientButton from "../components/GradientButton";
import {
  connectExchangeRequest,
  disconnectExchangeRequest,
  getApiErrorMessage,
  listExchangesRequest,
  syncExchangeCapitalRequest,
  withTimeout,
  type ExchangeConnection,
} from "../config/api";
import { formatMoney } from "../config/currency";
import { exchanges } from "../data/mock";
import { useAuth } from "../context/AuthContext";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "ExchangeConnect">;

const API_EXCHANGES = [
  { id: "binance", name: "Binance", color: "#F0B90B" },
  { id: "bybit", name: "Bybit", color: "#F7A600" },
  { id: "okx", name: "OKX", color: "#FFFFFF" },
];

export default function ExchangeConnectScreen({ navigation }: Props) {
  const { setExchangeConnected, completeOnboarding, refreshUser } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [tradeOnly, setTradeOnly] = useState(true);
  const [activeTab, setActiveTab] = useState<"USDT" | "USDC">("USDT");
  const [connected, setConnected] = useState<ExchangeConnection[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadConnections = useCallback(async () => {
    try {
      const res = await withTimeout(listExchangesRequest());
      if (res.success) {
        setConnected(res.data || []);
        if ((res.data || []).length > 0) {
          await setExchangeConnected(true);
        }
      }
    } catch {
      setConnected([]);
    } finally {
      setLoadingList(false);
    }
  }, [setExchangeConnected]);

  useFocusEffect(
    useCallback(() => {
      setLoadingList(true);
      loadConnections();
      // never leave spinner forever
      const t = setTimeout(() => setLoadingList(false), 5500);
      return () => clearTimeout(t);
    }, [loadConnections])
  );

  const finishOnboarding = async (isConnected: boolean) => {
    await setExchangeConnected(isConnected);
    await completeOnboarding();
    await refreshUser().catch(() => undefined);
    navigation.replace("MainTabs");
  };

  /** Always can leave this screen — goBack or Home (onboarding has no stack history) */
  const goHome = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    // Opened via replace (Splash / 2FA) — no previous screen
    void finishOnboarding(connected.length > 0);
  };

  const onConnect = async () => {
    if (!selected || !apiKey.trim() || !apiSecret.trim()) {
      Alert.alert("Missing fields", "API Key and Secret are required");
      return;
    }
    if (!tradeOnly) {
      Alert.alert(
        "Trade-only required",
        "Enable trade-only confirmation. Withdrawals must stay disabled on the exchange."
      );
      return;
    }
    if (selected === "okx" && !passphrase.trim()) {
      Alert.alert("OKX passphrase", "OKX requires the API passphrase");
      return;
    }

    setSubmitting(true);
    try {
      const res = await connectExchangeRequest({
        exchange: selected,
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim(),
        ...(selected === "okx" ? { passphrase: passphrase.trim() } : {}),
      });

      const cap = res.data?.capital;
      const capErr = res.data?.capitalError;
      let msg =
        "Exchange connected. Your funds stay on the exchange.\n\nVIP levels now use your exchange capital.";
      if (cap) {
        msg += `\n\nCapital: ${formatMoney(cap.totalDeposit, { decimals: 2 })}\nT-VIP: ${cap.tVipRank}\nC-VIP: ${cap.cVipRank}`;
      } else if (capErr) {
        msg += `\n\nCapital sync note: ${capErr}\nYou can retry “Sync capital” from VIP Plans.`;
      }

      Alert.alert("Connected", msg, [
        {
          text: "VIP Plans",
          onPress: async () => {
            await setExchangeConnected(true);
            await completeOnboarding();
            await refreshUser().catch(() => undefined);
            navigation.replace("TeamRank");
          },
        },
        {
          text: "Home",
          onPress: () => finishOnboarding(true),
        },
      ]);
      setApiKey("");
      setApiSecret("");
      setPassphrase("");
      setStep(1);
      await loadConnections();
    } catch (err) {
      Alert.alert("Connection failed", getApiErrorMessage(err, "Could not connect exchange"));
    } finally {
      setSubmitting(false);
    }
  };

  const onSync = async () => {
    setSyncing(true);
    try {
      const res = await syncExchangeCapitalRequest();
      const cap = res.data?.capital;
      Alert.alert(
        "Capital synced",
        `Exchange capital: ${formatMoney(cap?.totalDeposit ?? 0, { decimals: 2 })}\nT-VIP: ${cap?.tVipRank}\nC-VIP: ${cap?.cVipRank}`
      );
      await refreshUser().catch(() => undefined);
      await loadConnections();
    } catch (err) {
      Alert.alert("Sync failed", getApiErrorMessage(err, "Could not sync capital"));
    } finally {
      setSyncing(false);
    }
  };

  const onDisconnect = (exchange: string) => {
    Alert.alert(
      "Disconnect",
      `Remove ${exchange} API keys from MirrorTrade? Funds on the exchange are not affected.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            try {
              await disconnectExchangeRequest(exchange);
              await loadConnections();
              await refreshUser().catch(() => undefined);
            } catch (err) {
              Alert.alert("Error", getApiErrorMessage(err, "Disconnect failed"));
            }
          },
        },
      ]
    );
  };

  const renderExchangeCard = (ex: (typeof exchanges)[0] | (typeof API_EXCHANGES)[0], isConnected: boolean) => {
    const id = ex.id;
    const name = ex.name;
    const color = "color" in ex ? ex.color : colors.primary;
    const short = "short" in ex ? (ex as { short?: string }).short : name.slice(0, 3);
    const conn = connected.find((c) => c.exchange === id);

    return (
      <Pressable
        key={id}
        onPress={() => {
          if (isConnected) return;
          setSelected(id);
          setStep(2);
        }}
        style={styles.cardContainer}
      >
        {isConnected && (
          <View style={styles.statusBanner}>
            <Text style={styles.statusText}>
              Connected · capital {formatMoney(conn?.lastCapital ?? 0, { decimals: 0 })}
            </Text>
            <Pressable style={styles.modifyRow} onPress={() => onDisconnect(id)}>
              <Text style={styles.modifyText}>Disconnect</Text>
              <Ionicons name="chevron-forward" size={14} color="#FFF" />
            </Pressable>
          </View>
        )}

        <View style={styles.cardContent}>
          <View style={styles.exInfoLeft}>
            <View style={[styles.exIcon, { backgroundColor: `${color}22` }]}>
              <Text style={[styles.exShort, { color }]}>
                {(short || name).slice(0, 3).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.exName}>{name}</Text>
              <Text style={styles.exHint}>
                {isConnected
                  ? "Trade-only API · funds on exchange"
                  : "Connect API for VIP levels"}
              </Text>
            </View>
          </View>
          {!isConnected ? (
            <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
          ) : (
            <Ionicons name="checkmark-circle" size={22} color={colors.profit} />
          )}
        </View>
      </Pressable>
    );
  };

  if (step === 2) {
    const label =
      API_EXCHANGES.find((e) => e.id === selected)?.name ||
      exchanges.find((e) => e.id === selected)?.name ||
      selected;

    return (
      <Screen edges={["top", "bottom", "left", "right"]} keyboard>
        <View style={styles.headerDark}>
          <Pressable onPress={() => setStep(1)} style={styles.backBtnHeaderDark}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
            <Text style={styles.headerTitleDark}>API Credentials</Text>
          </Pressable>
          <Pressable onPress={goHome} hitSlop={12} style={styles.homeChipDark}>
            <Ionicons name="home-outline" size={16} color={colors.primary} />
            <Text style={styles.homeChipDarkText}>Home</Text>
          </Pressable>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.title}>API Credentials</Text>
          <Text style={styles.sub}>
            Paste your {label} trade-only API key. MirrorTrade never withdraws — deposit &
            withdraw only on the exchange. VIP levels use your exchange capital.
          </Text>
          <View style={styles.list}>
            <AuthInput
              icon="key-outline"
              placeholder="API Key"
              value={apiKey}
              onChangeText={setApiKey}
              autoCapitalize="none"
            />
            <AuthInput
              icon="lock-closed-outline"
              placeholder="API Secret"
              value={apiSecret}
              onChangeText={setApiSecret}
              secureTextEntry
              autoCapitalize="none"
            />
            {selected === "okx" ? (
              <AuthInput
                icon="shield-outline"
                placeholder="Passphrase (OKX)"
                value={passphrase}
                onChangeText={setPassphrase}
                secureTextEntry
                autoCapitalize="none"
              />
            ) : null}

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
                Enable: Spot/Futures trading · Read balances.{"\n"}
                Disable: Withdrawals, Transfer.{"\n"}
                Your money never leaves the exchange through this app.
              </Text>
            </View>

            <GradientButton
              label={submitting ? "Connecting…" : "Connect Exchange"}
              onPress={onConnect}
              loading={submitting}
              disabled={!apiKey || !apiSecret || !tradeOnly || submitting}
            />
          </View>
        </View>
      </Screen>
    );
  }

  const connectedIds = new Set(connected.map((c) => c.exchange));
  const mockConnected = exchanges.filter((e) => connectedIds.has(e.id));
  const available = API_EXCHANGES.filter((e) => !connectedIds.has(e.id));

  return (
    <Screen edges={["top", "left", "right"]} contentStyle={{ flex: 1, backgroundColor: "#F8F9FA" }}>
      <View style={styles.headerLight}>
        <View style={styles.headerLeft}>
          <Pressable
            onPress={goHome}
            hitSlop={12}
            style={styles.backHit}
            accessibilityRole="button"
            accessibilityLabel="Go back to home"
          >
            <Ionicons name="chevron-back" size={24} color="#000" />
          </Pressable>
          <Text style={styles.headerTitleLight}>API Connect</Text>
        </View>
        <Pressable
          onPress={goHome}
          hitSlop={12}
          style={styles.homeChip}
          accessibilityRole="button"
          accessibilityLabel="Go to home"
        >
          <Ionicons name="home-outline" size={16} color="#2562FF" />
          <Text style={styles.headerRightText}>Home</Text>
        </Pressable>
      </View>

      <View style={styles.tabsRow}>
        <Pressable
          onPress={() => setActiveTab("USDT")}
          style={[styles.tabBtn, activeTab === "USDT" && styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, activeTab === "USDT" && styles.tabTextActive]}>
            USDT
          </Text>
          {activeTab === "USDT" && <View style={styles.tabIndicator} />}
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("USDC")}
          style={[styles.tabBtn, activeTab === "USDC" && styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, activeTab === "USDC" && styles.tabTextActive]}>
            USDC
          </Text>
          {activeTab === "USDC" && <View style={styles.tabIndicator} />}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={18} color="#2562FF" />
          <Text style={styles.infoBannerText}>
            No payments inside MirrorTrade. Deposit / withdraw on your exchange. VIP levels
            update from exchange capital after API connect.
          </Text>
        </View>

        {loadingList ? (
          <Text style={{ color: "#888", marginBottom: 12, textAlign: "center" }}>
            Checking connections…
          </Text>
        ) : null}

        {connected.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Connected API</Text>
              <Pressable onPress={onSync} disabled={syncing}>
                <Text style={styles.syncLink}>
                  {syncing ? "Syncing…" : "Sync capital"}
                </Text>
              </Pressable>
            </View>
            {(mockConnected.length ? mockConnected : connected).map((ex) =>
              renderExchangeCard(
                "exchange" in ex
                  ? {
                      id: (ex as ExchangeConnection).exchange,
                      name: (ex as ExchangeConnection).exchange,
                      color: colors.primary,
                    }
                  : ex,
                true
              )
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CEX API</Text>
          <Text style={styles.sectionSub}>
            Trade-only API permissions. Funds always remain on your exchange.
          </Text>
          {available.map((ex) => renderExchangeCard(ex, false))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerLight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  backHit: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  homeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#E8F0FF",
  },
  headerTitleLight: { fontSize: 18, fontWeight: "700", color: "#000" },
  headerRightText: { fontSize: 14, color: "#2562FF", fontWeight: "600" },
  tabsRow: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  tabBtn: { paddingVertical: 12, marginRight: 20 },
  tabBtnActive: {},
  tabText: { fontSize: 14, color: "#888", fontWeight: "600" },
  tabTextActive: { color: "#000" },
  tabIndicator: {
    height: 2,
    backgroundColor: "#2562FF",
    marginTop: 8,
    borderRadius: 1,
  },
  scrollContent: { padding: 16, paddingBottom: 40 },
  infoBanner: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#E8F0FF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  infoBannerText: { flex: 1, fontSize: 12, color: "#1E3A5F", lineHeight: 17 },
  section: { marginBottom: 20 },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  sectionSub: { fontSize: 12, color: "#888", marginBottom: 12, lineHeight: 17 },
  syncLink: { color: "#2562FF", fontWeight: "700", fontSize: 13 },
  cardContainer: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    marginBottom: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EEE",
  },
  statusBanner: {
    backgroundColor: "#2562FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusText: { color: "#FFF", fontSize: 12, fontWeight: "600" },
  modifyRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  modifyText: { color: "#FFF", fontSize: 12 },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  exInfoLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  exIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  exShort: { fontWeight: "800", fontSize: 12 },
  exName: { fontSize: 15, fontWeight: "700", color: "#111" },
  exHint: { fontSize: 11, color: "#888", marginTop: 2 },
  headerDark: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtnHeaderDark: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitleDark: { fontSize: 18, fontWeight: "700", color: colors.text },
  homeChipDark: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
  },
  homeChipDarkText: { color: colors.primary, fontSize: 13, fontWeight: "700" },
  formContainer: { padding: 16 },
  title: { fontSize: 22, fontWeight: "800", color: colors.text, marginBottom: 8 },
  sub: { fontSize: 13, color: colors.muted, lineHeight: 19, marginBottom: 16 },
  list: { gap: 12 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkText: { flex: 1, color: colors.text, fontSize: 13 },
  warnBox: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  warnTitle: { color: colors.warn, fontWeight: "700", marginBottom: 6 },
  warnBody: { color: colors.muted, fontSize: 12, lineHeight: 18 },
});
