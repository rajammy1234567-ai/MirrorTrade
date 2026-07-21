import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View, ScrollView, Image } from "react-native";
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
  const [activeTab, setActiveTab] = useState<"USDT" | "USDC">("USDT");

  const finish = async (connected: boolean) => {
    await setExchangeConnected(connected);
    await completeOnboarding();
    navigation.replace("MainTabs");
  };

  const renderExchangeCard = (ex: any, isConnected: boolean) => {
    return (
      <Pressable
        key={ex.id}
        onPress={() => {
          setSelected(ex.id);
          setStep(2);
        }}
        style={styles.cardContainer}
      >
        {isConnected && ex.status && (
          <View style={styles.statusBanner}>
            <Text style={styles.statusText}>{ex.status}</Text>
            <View style={styles.modifyRow}>
              <Text style={styles.modifyText}>Modify</Text>
              <Ionicons name="chevron-forward" size={14} color="#FFF" />
            </View>
          </View>
        )}
        
        <View style={styles.cardContent}>
          <View style={styles.exInfoLeft}>
            {ex.logo ? (
              <Image source={{ uri: ex.logo }} style={styles.exIconImage} resizeMode="contain" />
            ) : (
              <View style={[styles.exIcon, { backgroundColor: `${ex.color}22` }]}>
                <Text style={[styles.exShort, { color: ex.color }]}>
                  {ex.short.slice(0, 3)}
                </Text>
              </View>
            )}
            <View>
              <View style={styles.exNameRow}>
                <Text style={styles.exName}>{ex.name}</Text>
                {ex.hot && <Text style={styles.hotIcon}>🔥</Text>}
              </View>
              <View style={styles.tagsRow}>
                {ex.tags?.map((tag: string) => (
                  <View key={tag} style={[styles.tag, tag === 'Quick' ? styles.tagQuick : null]}>
                    <Text style={[styles.tagText, tag === 'Quick' ? styles.tagTextQuick : null]}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
          
          <View style={styles.exInfoRight}>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Spot</Text>
              <Text style={styles.statValue}>{ex.spot} {ex.spot !== '--' ? 'Coins' : ''}</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Futures</Text>
              <Text style={styles.statValue}>{ex.futures} {ex.futures !== '--' ? 'Perp' : ''}</Text>
            </View>
          </View>
        </View>

        {isConnected && ex.isProtected && (
          <View style={styles.protectedBanner}>
            <Ionicons name="shield-checkmark" size={14} color="#2562FF" />
            <Text style={styles.protectedText}>API Protected by AWS KMS</Text>
            <Ionicons name="help-circle-outline" size={16} color="#888" style={{marginLeft: 'auto'}} />
          </View>
        )}

        {ex.latestListing && (
          <View style={styles.listingRow}>
            <Text style={styles.listingText}>Latest Listing: {ex.latestListing}</Text>
            <Text style={styles.listingDate}>{ex.latestListingDate}</Text>
          </View>
        )}
      </Pressable>
    );
  };

  if (step === 2) {
    return (
      <Screen edges={["top", "bottom", "left", "right"]}>
        <View style={styles.headerDark}>
          <Pressable onPress={() => setStep(1)} style={styles.backBtnHeaderDark}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
            <Text style={styles.headerTitleDark}>API Connect</Text>
          </Pressable>
        </View>
        
        <View style={styles.formContainer}>
          <Text style={styles.title}>API Credentials</Text>
          <Text style={styles.sub}>
            Paste your {exchanges.find((e) => e.id === selected)?.name || ""} API key and secret.
          </Text>
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
          </View>
        </View>
      </Screen>
    );
  }

  const connectedExchanges = exchanges.filter(e => e.connected);
  const otherExchanges = exchanges.filter(e => !e.connected);

  return (
    <Screen edges={["top", "left", "right"]} contentStyle={{flex: 1, backgroundColor: "#F8F9FA"}}>
      <View style={styles.headerLight}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color="#000" />
          </Pressable>
          <Text style={styles.headerTitleLight}>API Connect</Text>
        </View>
        <Pressable onPress={() => finish(false)}>
          <Text style={styles.headerRightText}>Exchange</Text>
        </Pressable>
      </View>

      <View style={styles.tabsRow}>
        <Pressable onPress={() => setActiveTab("USDT")} style={[styles.tabBtn, activeTab === "USDT" && styles.tabBtnActive]}>
          <Text style={[styles.tabText, activeTab === "USDT" && styles.tabTextActive]}>USDT</Text>
          {activeTab === "USDT" && <View style={styles.tabIndicator} />}
        </Pressable>
        <Pressable onPress={() => setActiveTab("USDC")} style={[styles.tabBtn, activeTab === "USDC" && styles.tabBtnActive]}>
          <Text style={[styles.tabText, activeTab === "USDC" && styles.tabTextActive]}>USDC</Text>
          {activeTab === "USDC" && <View style={styles.tabIndicator} />}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {connectedExchanges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Connected API</Text>
            {connectedExchanges.map(ex => renderExchangeCard(ex, true))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CEX API</Text>
          <Text style={styles.sectionSub}>
            We only have API trading permissions, and your funds always remain securely in your exchange.
          </Text>
          {otherExchanges.map(ex => renderExchangeCard(ex, false))}
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
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitleLight: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },
  headerRightText: {
    fontSize: 14,
    color: "#888",
  },
  tabsRow: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  tabBtn: {
    paddingVertical: 14,
    marginRight: 24,
    position: "relative",
  },
  tabBtnActive: {},
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#888",
  },
  tabTextActive: {
    color: "#000",
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "#F0B90B",
    borderRadius: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
  },
  sectionSub: {
    fontSize: 13,
    color: "#888",
    marginBottom: 16,
    lineHeight: 18,
  },
  cardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  statusBanner: {
    backgroundColor: "#2EBD85",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "500",
  },
  modifyRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  modifyText: {
    color: "#FFF",
    fontSize: 12,
    marginRight: 2,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  exInfoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  exIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  exIconImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  exShort: {
    fontSize: 10,
    fontWeight: "800",
  },
  exNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  exName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  hotIcon: {
    fontSize: 14,
  },
  tagsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  tag: {
    backgroundColor: "#E6F9F0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 10,
    color: "#2EBD85",
    fontWeight: "600",
  },
  tagQuick: {
    backgroundColor: "#F5F5F5",
  },
  tagTextQuick: {
    color: "#888",
  },
  exInfoRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  statCol: {
    alignItems: "flex-end",
  },
  statLabel: {
    fontSize: 11,
    color: "#888",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#000",
  },
  protectedBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F5FF",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 8,
    borderRadius: 6,
    gap: 6,
  },
  protectedText: {
    fontSize: 12,
    color: "#2562FF",
    fontWeight: "600",
  },
  listingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
  },
  listingText: {
    fontSize: 11,
    color: "#888",
  },
  listingDate: {
    fontSize: 11,
    color: "#888",
  },
  
  // Step 2 Styles
  headerDark: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtnHeaderDark: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitleDark: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  formContainer: {
    padding: 20,
  },
  title: {
    marginTop: 10,
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
});
