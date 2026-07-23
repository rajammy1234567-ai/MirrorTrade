import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { exchanges, type ExchangeCatalogItem } from "../data/mock";
import { useAuth } from "../context/AuthContext";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "ExchangeConnect">;

const favicon = (domain: string) =>
  `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;

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

  const catalogById = useMemo(() => {
    const map = new Map<string, ExchangeCatalogItem>();
    exchanges.forEach((e) => map.set(e.id, e));
    return map;
  }, []);

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

  const goHome = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    void finishOnboarding(connected.length > 0);
  };

  const selectedMeta = selected ? catalogById.get(selected) : undefined;
  const needsPass = !!selectedMeta?.needsPassphrase;

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
    if (needsPass && !passphrase.trim()) {
      Alert.alert(
        selectedMeta?.passphraseLabel || "Passphrase",
        `${selectedMeta?.name || selected} requires ${
          selectedMeta?.passphraseLabel?.toLowerCase() || "a passphrase"
        }.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await connectExchangeRequest({
        exchange: selected,
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim(),
        ...(needsPass ? { passphrase: passphrase.trim() } : {}),
      });

      const cap = res.data?.capital;
      const capErr = res.data?.capitalError;
      let msg =
        "Exchange connected. Your funds stay on the exchange.\n\nVIP levels now use your exchange capital.";
      if (cap) {
        msg += `\n\nCapital: ${formatMoney(cap.totalDeposit, { decimals: 2 })}\nT-VIP: ${cap.tVipRank}\nC-VIP: ${cap.cVipRank}`;
      } else if (capErr) {
        msg += `\n\nCapital sync note: ${capErr}\nYou can retry “Sync capital”.`;
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
      Alert.alert(
        "Connection failed",
        getApiErrorMessage(err, "Could not connect exchange")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onSync = async (exchangeId?: string) => {
    setSyncing(true);
    try {
      const res = await syncExchangeCapitalRequest(exchangeId);
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
    const label = catalogById.get(exchange)?.name || exchange;
    Alert.alert(
      "Disconnect",
      `Remove ${label} API keys from MirrorTrade? Funds on the exchange are not affected.`,
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

  const openConnect = (id: string) => {
    setSelected(id);
    setApiKey("");
    setApiSecret("");
    setPassphrase("");
    setTradeOnly(true);
    setStep(2);
  };

  const filteredCatalog = useMemo(() => {
    return exchanges.filter((e) => {
      if (activeTab === "USDT") return e.quote === "USDT" || e.quote === "BOTH" || !e.quote;
      return e.quote === "USDC" || e.quote === "BOTH";
    });
  }, [activeTab]);

  const connectedIds = new Set(connected.map((c) => c.exchange));
  const available = filteredCatalog.filter((e) => !connectedIds.has(e.id));
  const connectedRows = connected
    .map((c) => ({
      conn: c,
      meta: catalogById.get(c.exchange),
    }))
    .filter((r) => r.meta);

  /* ───────── Step 2: credentials form ───────── */
  if (step === 2 && selectedMeta) {
    return (
      <Screen edges={["top", "bottom", "left", "right"]} keyboard>
        <View style={styles.headerDark}>
          <Pressable onPress={() => setStep(1)} style={styles.backBtnHeaderDark}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
            <Text style={styles.headerTitleDark}>
              Connect {selectedMeta.name}
            </Text>
          </Pressable>
          <Pressable onPress={goHome} hitSlop={12} style={styles.homeChipDark}>
            <Ionicons name="home-outline" size={16} color={colors.primary} />
            <Text style={styles.homeChipDarkText}>Home</Text>
          </Pressable>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.selectedHero}>
            <ExchangeLogo meta={selectedMeta} size={48} />
            <View style={{ flex: 1 }}>
              <Text style={styles.selectedName}>{selectedMeta.name}</Text>
              <Text style={styles.selectedHint}>
                Trade-only API · funds stay on exchange
              </Text>
            </View>
          </View>

          <Text style={styles.sub}>
            Paste your {selectedMeta.name} API key & secret. MirrorTrade never
            withdraws — deposit & withdraw only on the exchange. VIP levels use
            your exchange capital.
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
            {needsPass ? (
              <AuthInput
                icon="shield-outline"
                placeholder={selectedMeta.passphraseLabel || "Passphrase"}
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
              label={submitting ? "Connecting…" : `Connect ${selectedMeta.name}`}
              onPress={onConnect}
              loading={submitting}
              disabled={
                !apiKey ||
                !apiSecret ||
                !tradeOnly ||
                submitting ||
                (needsPass && !passphrase)
              }
            />
          </View>
        </View>
      </Screen>
    );
  }

  /* ───────── Step 1: exchange list ───────── */
  return (
    <Screen
      edges={["top", "left", "right"]}
      contentStyle={{ flex: 1, backgroundColor: "#F8F9FA" }}
    >
      <View style={styles.headerLight}>
        <View style={styles.headerLeft}>
          <Pressable
            onPress={goHome}
            hitSlop={12}
            style={styles.backHit}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={24} color="#000" />
          </Pressable>
          <Text style={styles.headerTitleLight}>API Connect</Text>
        </View>
        <Pressable onPress={goHome} hitSlop={12} style={styles.homeChip}>
          <Ionicons name="home-outline" size={16} color="#2562FF" />
          <Text style={styles.headerRightText}>Home</Text>
        </Pressable>
      </View>

      <View style={styles.tabsRow}>
        {(["USDT", "USDC"] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
          >
            <Text
              style={[styles.tabText, activeTab === tab && styles.tabTextActive]}
            >
              {tab}
            </Text>
            {activeTab === tab ? <View style={styles.tabIndicator} /> : null}
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={18} color="#2562FF" />
          <Text style={styles.infoBannerText}>
            No payments inside MirrorTrade. Deposit / withdraw on your exchange.
            Connect API key + secret — VIP levels update from exchange capital.
          </Text>
        </View>

        {loadingList ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#2562FF" />
            <Text style={styles.loadingText}>Checking connections…</Text>
          </View>
        ) : null}

        {connectedRows.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Connected API</Text>
              <Pressable onPress={() => onSync()} disabled={syncing}>
                <Text style={styles.syncLink}>
                  {syncing ? "Syncing…" : "Sync capital"}
                </Text>
              </Pressable>
            </View>
            {connectedRows.map(({ conn, meta }) => (
              <ConnectedCard
                key={conn.exchange}
                meta={meta!}
                conn={conn}
                onModify={() => onDisconnect(conn.exchange)}
                onSync={() => onSync(conn.exchange)}
              />
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CEX API</Text>
          <Text style={styles.sectionSub}>
            We only have API trading permissions, and your funds always remain
            securely in your exchange.
          </Text>
          {available.map((ex) => (
            <CexCard key={ex.id} meta={ex} onPress={() => openConnect(ex.id)} />
          ))}
          {available.length === 0 && !loadingList ? (
            <Text style={styles.emptyAvail}>
              All supported exchanges are connected for {activeTab}.
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

/* ─── UI pieces ─── */

function ExchangeLogo({
  meta,
  size = 40,
}: {
  meta: ExchangeCatalogItem;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <View
        style={[
          styles.logoFallback,
          {
            width: size,
            height: size,
            borderRadius: size * 0.28,
            backgroundColor: `${meta.color}22`,
          },
        ]}
      >
        <Text style={[styles.logoShort, { color: meta.color, fontSize: size * 0.28 }]}>
          {meta.short.slice(0, 3)}
        </Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri: favicon(meta.domain) }}
      style={{ width: size, height: size, borderRadius: size * 0.28 }}
      onError={() => setFailed(true)}
    />
  );
}

function ConnectedCard({
  meta,
  conn,
  onModify,
  onSync,
}: {
  meta: ExchangeCatalogItem;
  conn: ExchangeConnection;
  onModify: () => void;
  onSync: () => void;
}) {
  const status =
    conn.permissions?.futuresTrading && !conn.permissions?.spotTrading
      ? "API is normal,but only enable futures."
      : conn.status === "connected"
        ? "API is normal."
        : conn.status;

  return (
    <View style={styles.cardContainer}>
      <View style={styles.statusBanner}>
        <Text style={styles.statusText} numberOfLines={1}>
          {status}
        </Text>
        <Pressable style={styles.modifyRow} onPress={onModify}>
          <Text style={styles.modifyText}>Modify</Text>
          <Ionicons name="chevron-forward" size={14} color="#FFF" />
        </Pressable>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.exInfoLeft}>
          <ExchangeLogo meta={meta} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.nameRow}>
              <Text style={styles.exName}>{meta.name}</Text>
              <View style={styles.tagUsdt}>
                <Text style={styles.tagUsdtText}>USDT</Text>
              </View>
            </View>
            <View style={styles.metricsRow}>
              <Metric label="Spot" value={`${meta.spot} Coins`} />
              <Metric label="Futures" value={`${meta.futures} Perp`} />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.protectRow}>
        <Ionicons name="shield-checkmark" size={14} color="#2562FF" />
        <Text style={styles.protectText}>
          Capital {formatMoney(conn.lastCapital ?? 0, { decimals: 2 })} · API
          protected
        </Text>
        <Pressable onPress={onSync} hitSlop={8}>
          <Text style={styles.syncMini}>Sync</Text>
        </Pressable>
      </View>
    </View>
  );
}

function CexCard({
  meta,
  onPress,
}: {
  meta: ExchangeCatalogItem;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.cexCard}>
      <View style={styles.exInfoLeft}>
        <ExchangeLogo meta={meta} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.nameRow}>
            <Text style={styles.exName}>{meta.name}</Text>
            {meta.hot ? (
              <Text style={styles.hotIcon}>🔥</Text>
            ) : null}
            <View style={styles.tagUsdt}>
              <Text style={styles.tagUsdtText}>USDT</Text>
            </View>
            {meta.quick ? (
              <View style={styles.tagQuick}>
                <Text style={styles.tagQuickText}>Quick</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.metricsRow}>
            <Metric label="Spot" value={`${meta.spot} Coins`} />
            <Metric
              label="Futures"
              value={
                meta.futures === "--" ? "--" : `${meta.futures} Perp`
              }
            />
          </View>
          {meta.latestListing ? (
            <Text style={styles.listing}>
              Latest Listing: {meta.latestListing}
              {meta.latestListingDate
                ? `    ${meta.latestListingDate}`
                : ""}
            </Text>
          ) : null}
        </View>
      </View>
      <Ionicons name="add-circle-outline" size={22} color="#2562FF" />
    </Pressable>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

/* ─── styles ─── */

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
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  loadingText: { color: "#888", fontSize: 13 },
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
  sectionSub: {
    fontSize: 12,
    color: "#888",
    marginBottom: 12,
    lineHeight: 17,
  },
  syncLink: { color: "#2562FF", fontWeight: "700", fontSize: 13 },
  emptyAvail: {
    textAlign: "center",
    color: "#888",
    fontSize: 13,
    paddingVertical: 16,
  },

  cardContainer: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    marginBottom: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EEE",
  },
  statusBanner: {
    backgroundColor: "#22C55E",
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusText: { color: "#FFF", fontSize: 12, fontWeight: "600", flex: 1 },
  modifyRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  modifyText: { color: "#FFF", fontSize: 12, fontWeight: "600" },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  protectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 12,
    marginBottom: 12,
    backgroundColor: "#E8F0FF",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  protectText: { flex: 1, fontSize: 11, color: "#1E3A5F", fontWeight: "600" },
  syncMini: { color: "#2562FF", fontWeight: "700", fontSize: 12 },

  cexCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#EEE",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  exInfoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  logoFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoShort: { fontWeight: "800" },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  exName: { fontSize: 15, fontWeight: "700", color: "#111" },
  hotIcon: { fontSize: 12 },
  tagUsdt: {
    backgroundColor: "#E8F8EF",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  tagUsdtText: { fontSize: 10, fontWeight: "700", color: "#16A34A" },
  tagQuick: {
    backgroundColor: "#EEF2FF",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  tagQuickText: { fontSize: 10, fontWeight: "700", color: "#4F46E5" },
  metricsRow: {
    flexDirection: "row",
    gap: 20,
    marginTop: 8,
  },
  metric: {},
  metricLabel: { fontSize: 11, color: "#999", marginBottom: 2 },
  metricValue: { fontSize: 13, fontWeight: "600", color: "#333" },
  listing: {
    marginTop: 8,
    fontSize: 11,
    color: "#AAA",
  },

  headerDark: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtnHeaderDark: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  headerTitleDark: { fontSize: 17, fontWeight: "700", color: colors.text },
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
  selectedHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  selectedName: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
  },
  selectedHint: {
    marginTop: 2,
    fontSize: 12,
    color: colors.muted,
  },
  sub: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 19,
    marginBottom: 16,
  },
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
