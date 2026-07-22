import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import Screen from "../components/Screen";
import GradientButton from "../components/GradientButton";
import VipCharts from "../components/VipCharts";
import {
  getApiErrorMessage,
  getMyPlanStatusRequest,
  getMyTransactionsRequest,
  listExchangesRequest,
  syncExchangeCapitalRequest,
  withTimeout,
  type CVipPlan,
  type ExchangeConnection,
  type PlanStatus,
  type PlanTransaction,
  type ProgressMetric,
  type TVipPlan,
} from "../config/api";
import { formatMoney } from "../config/currency";
import { useAuth } from "../context/AuthContext";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "TeamRank">;
type FocusTab = "overview" | "T-VIP" | "C-VIP" | "capital";

const TYPE_LABELS: Record<string, string> = {
  DEPOSIT: "Capital update",
  T_VIP_PROFIT_SHARE: "T-VIP Profit Share",
  SAME_LEVEL_BONUS: "Same Level Bonus",
  GLOBAL_DEV_BONUS: "Global Dev Bonus",
  WITHDRAWAL: "Withdrawal",
};

const T_VIP_STRATEGY = [
  {
    icon: "wallet-outline" as const,
    title: "Exchange capital",
    desc: "Apna capital exchange pe rakho (deposit/withdraw sirf exchange pe). App us capital se level decide karti hai.",
  },
  {
    icon: "trending-up-outline" as const,
    title: "Profit share %",
    desc: "Exchange trading profit pool se aapko rank ke hisaab se % milta hai (20% → 65%).",
  },
  {
    icon: "diamond-outline" as const,
    title: "Auto upgrade",
    desc: "Capital sync ke baad higher T-VIP unlock — koi in-app payment nahi.",
  },
];

const C_VIP_STRATEGY = [
  {
    icon: "person-outline" as const,
    title: "Own capital",
    desc: "Pehle apna exchange capital min level ke barabar hona chahiye.",
  },
  {
    icon: "people-outline" as const,
    title: "Direct referrals",
    desc: "Apne code se join hone wale direct members.",
  },
  {
    icon: "git-network-outline" as const,
    title: "Team business",
    desc: "Poori downline ka exchange capital total = team business.",
  },
];

function ProgressBar({
  percent,
  color = colors.primary,
}: {
  percent: number;
  color?: string;
}) {
  const p = Math.max(0, Math.min(100, percent || 0));
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${p}%`, backgroundColor: color }]} />
    </View>
  );
}

function RequirementRow({
  label,
  metric,
  format = "number",
  color = colors.primary,
}: {
  label: string;
  metric: ProgressMetric;
  format?: "number" | "money";
  color?: string;
}) {
  const cur =
    format === "money"
      ? formatMoney(metric.current, { decimals: 0 })
      : String(metric.current);
  const tgt =
    format === "money"
      ? formatMoney(metric.target, { decimals: 0 })
      : String(metric.target);
  const met = metric.met ?? metric.percent >= 100;

  return (
    <View style={styles.reqRow}>
      <View style={styles.reqHeader}>
        <View style={styles.reqLeft}>
          <Ionicons
            name={met ? "checkmark-circle" : "ellipse-outline"}
            size={18}
            color={met ? colors.profit : colors.muted}
          />
          <Text style={styles.reqLabel}>{label}</Text>
        </View>
        <Text style={[styles.reqValue, met && { color: colors.profit }]}>
          {cur} / {tgt}
        </Text>
      </View>
      <ProgressBar percent={metric.percent} color={met ? colors.profit : color} />
    </View>
  );
}

function StrategyStep({
  index,
  icon,
  title,
  desc,
  accent,
}: {
  index: number;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
  accent: string;
}) {
  return (
    <View style={styles.strategyStep}>
      <View
        style={[
          styles.strategyNum,
          { backgroundColor: `${accent}22`, borderColor: `${accent}55` },
        ]}
      >
        <Text style={[styles.strategyNumText, { color: accent }]}>{index}</Text>
      </View>
      <View style={[styles.strategyIconWrap, { backgroundColor: `${accent}18` }]}>
        <Ionicons name={icon} size={18} color={accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.strategyTitle}>{title}</Text>
        <Text style={styles.strategyDesc}>{desc}</Text>
      </View>
    </View>
  );
}

function TVipPlanCard({ row, active }: { row: TVipPlan; active: boolean }) {
  const share = row.profitSharePercent;
  return (
    <View style={[styles.planCard, active && styles.planCardActiveT]}>
      {active ? (
        <View style={styles.youPill}>
          <Text style={styles.youPillText}>YOUR RANK</Text>
        </View>
      ) : null}
      <View style={styles.planCardTop}>
        <View>
          <Text style={[styles.planRank, active && { color: "#9BB0FF" }]}>{row.rank}</Text>
          <Text style={styles.planMin}>
            Min capital {formatMoney(row.minDeposit, { decimals: 0 })}
          </Text>
        </View>
        <View style={styles.shareBubble}>
          <Text style={styles.sharePct}>{share}%</Text>
          <Text style={styles.shareLabel}>profit share</Text>
        </View>
      </View>
      <View style={styles.shareBarBg}>
        <View style={[styles.shareBarFill, { width: `${Math.min(100, share)}%` }]} />
      </View>
    </View>
  );
}

function CVipPlanCard({
  row,
  active,
  capital,
  directs,
  teamBusiness,
}: {
  row: CVipPlan;
  active: boolean;
  capital: number;
  directs: number;
  teamBusiness: number;
}) {
  const dOk = capital >= row.minDeposit;
  const dirOk = directs >= row.minDirects;
  const tOk = teamBusiness >= row.minTeamBusiness;

  return (
    <View style={[styles.planCard, active && styles.planCardActiveC]}>
      {active ? (
        <View style={[styles.youPill, { backgroundColor: "rgba(247,166,0,0.2)" }]}>
          <Text style={[styles.youPillText, { color: "#F7A600" }]}>YOUR RANK</Text>
        </View>
      ) : null}
      <Text style={[styles.planRank, active && { color: "#F7A600" }]}>{row.rank}</Text>
      <Text style={styles.planMin}>All 3 conditions required</Text>
      <View style={styles.condGrid}>
        <CondBox ok={dOk} label="Capital" value={formatMoney(row.minDeposit, { decimals: 0 })} />
        <CondBox ok={dirOk} label="Directs" value={String(row.minDirects)} />
        <CondBox
          ok={tOk}
          label="Team"
          value={formatMoney(row.minTeamBusiness, { decimals: 0 })}
        />
      </View>
    </View>
  );
}

function CondBox({
  ok,
  label,
  value,
}: {
  ok: boolean;
  label: string;
  value: string;
}) {
  return (
    <View style={[styles.condBox, ok ? styles.condBoxOk : styles.condBoxNo]}>
      <Ionicons
        name={ok ? "checkmark-circle" : "close-circle-outline"}
        size={14}
        color={ok ? colors.profit : colors.muted}
      />
      <Text style={styles.condBoxLabel}>{label}</Text>
      <Text style={[styles.condBoxVal, ok && { color: colors.profit }]}>{value}</Text>
    </View>
  );
}

export default function TeamRankScreen({ navigation, route }: Props) {
  const { refreshUser } = useAuth();
  const initialFocus: FocusTab =
    route.params?.focus === "T-VIP" || route.params?.focus === "C-VIP"
      ? route.params.focus
      : "overview";

  const [tab, setTab] = useState<FocusTab>(initialFocus);
  const [status, setStatus] = useState<PlanStatus | null>(null);
  const [payouts, setPayouts] = useState<PlanTransaction[]>([]);
  const [exchanges, setExchanges] = useState<ExchangeConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [planRes, txRes, exRes] = await Promise.all([
        withTimeout(getMyPlanStatusRequest(), 6000),
        withTimeout(getMyTransactionsRequest(20), 6000).catch(() => null),
        withTimeout(listExchangesRequest(), 6000).catch(() => null),
      ]);
      if (planRes?.success) setStatus(planRes.data);
      if (txRes?.success) setPayouts(txRes.data);
      if (exRes?.success) setExchanges(exRes.data || []);
      await refreshUser().catch(() => undefined);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load VIP status"));
      // Offline fallback so UI is not stuck on spinner
      setStatus((prev) =>
        prev ?? {
          totalDeposit: 0,
          walletBalance: 0,
          tVipRank: "NONE",
          cVipRank: "NONE",
          tVipProfitSharePercent: 0,
          referralCode: "",
          directs: 0,
          teamBusiness: 0,
          nextTVip: null,
          nextCVip: null,
          plans: { tVip: [], cVip: [] },
        }
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshUser]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    if (route.params?.focus === "T-VIP" || route.params?.focus === "C-VIP") {
      setTab(route.params.focus);
    }
  }, [route.params?.focus]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const onSyncCapital = async () => {
    if (!exchanges.length) {
      Alert.alert(
        "Connect exchange first",
        "VIP levels use your exchange capital. Connect a trade-only API key first.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Connect API",
            onPress: () => navigation.navigate("ExchangeConnect"),
          },
        ]
      );
      return;
    }
    setSyncing(true);
    try {
      const res = await syncExchangeCapitalRequest();
      const cap = res.data.capital;
      Alert.alert(
        "Capital synced",
        `Exchange capital: ${formatMoney(cap.totalDeposit, { decimals: 2 })}\nT-VIP: ${cap.tVipRank}\nC-VIP: ${cap.cVipRank}`
      );
      await load();
    } catch (err) {
      Alert.alert("Sync failed", getApiErrorMessage(err, "Could not sync capital"));
    } finally {
      setSyncing(false);
    }
  };

  if (loading && !status) {
    return (
      <Screen edges={["top", "bottom", "left", "right"]} scroll={false} padded={false}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
            <Text style={styles.headerTitle}>VIP Levels</Text>
          </Pressable>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  const tVipPlans = status?.plans?.tVip ?? [];
  const cVipPlans = status?.plans?.cVip ?? [];
  const tProgress = status?.tVipProgress;
  const cProgress = status?.cVipProgress;
  const capital = status?.exchangeCapital ?? status?.totalDeposit ?? 0;
  const hasExchange = exchanges.length > 0;

  return (
    <Screen edges={["top", "bottom", "left", "right"]} scroll={false} padded={false}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
          <Text style={styles.headerTitle}>VIP Levels</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsScroll}
        style={styles.tabsWrap}
      >
        {(
          [
            { key: "overview", label: "Overview", icon: "grid-outline" },
            { key: "T-VIP", label: "T-VIP", icon: "diamond-outline" },
            { key: "C-VIP", label: "C-VIP", icon: "star-outline" },
            { key: "capital", label: "Capital", icon: "link-outline" },
          ] as const
        ).map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setTab(t.key)}
            >
              <Ionicons
                name={t.icon}
                size={15}
                color={active ? colors.text : colors.muted}
              />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={load}>
              <Text style={styles.retry}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {/* OVERVIEW */}
        {tab === "overview" && status ? (
          <>
            <View style={styles.modelBanner}>
              <Ionicons name="shield-checkmark" size={18} color={colors.profit} />
              <Text style={styles.modelBannerText}>
                No in-app payments. Deposit & withdraw only on your exchange. This app only
                calculates VIP levels from exchange capital + team.
              </Text>
            </View>

            <LinearGradient
              colors={["#1A2040", "#12161F"]}
              style={styles.hero}
            >
              <Text style={styles.heroLabel}>Exchange capital (VIP base)</Text>
              <Text style={styles.heroValue}>
                {formatMoney(capital, { decimals: 2 })}
              </Text>
              <Text style={styles.heroMeta}>
                Source: {status.capitalSource || "none"}
                {status.primaryExchange ? ` · ${status.primaryExchange}` : ""}
                {status.capitalSyncedAt
                  ? ` · synced ${new Date(status.capitalSyncedAt).toLocaleString("en-IN")}`
                  : ""}
              </Text>
              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatLabel}>Team</Text>
                  <Text style={styles.heroStatVal}>
                    {formatMoney(status.teamBusiness, { decimals: 0 })}
                  </Text>
                </View>
                <View style={styles.heroDivider} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatLabel}>Directs</Text>
                  <Text style={styles.heroStatVal}>{status.directs}</Text>
                </View>
                <View style={styles.heroDivider} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatLabel}>Earnings</Text>
                  <Text style={styles.heroStatVal}>
                    {formatMoney(status.walletBalance, { decimals: 0 })}
                  </Text>
                </View>
              </View>
            </LinearGradient>

            <View style={styles.rankDuo}>
              <Pressable style={styles.rankCard} onPress={() => setTab("T-VIP")}>
                <LinearGradient colors={["#2A3A7A", "#1A2548"]} style={styles.rankGrad}>
                  <MaterialCommunityIcons name="diamond-stone" size={28} color="#8BA3FF" />
                  <Text style={styles.rankCardLabel}>T-VIP</Text>
                  <Text style={styles.rankCardValue}>{status.tVipRank || "NONE"}</Text>
                  <Text style={styles.rankCardMeta}>
                    {status.tVipProfitSharePercent}% profit share
                  </Text>
                </LinearGradient>
              </Pressable>
              <Pressable style={styles.rankCard} onPress={() => setTab("C-VIP")}>
                <LinearGradient colors={["#5C4010", "#2A1E08"]} style={styles.rankGrad}>
                  <MaterialCommunityIcons name="crown" size={28} color="#F7A600" />
                  <Text style={styles.rankCardLabel}>C-VIP</Text>
                  <Text style={[styles.rankCardValue, { color: "#F7A600" }]}>
                    {status.cVipRank || "NONE"}
                  </Text>
                  <Text style={styles.rankCardMeta}>{status.directs} directs</Text>
                </LinearGradient>
              </Pressable>
            </View>

            {/* Charts — overview analytics */}
            <VipCharts
              status={status}
              transactions={payouts}
              onOpenTVip={() => setTab("T-VIP")}
              onOpenCVip={() => setTab("C-VIP")}
            />

            {!hasExchange ? (
              <Pressable onPress={() => navigation.navigate("ExchangeConnect")}>
                <LinearGradient
                  colors={["#4F6EF7", "#8B5CF6"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.depositCta}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.depositCtaTitle}>Connect exchange API</Text>
                    <Text style={styles.depositCtaSub}>
                      Levels unlock from exchange capital — no app payment
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward-circle" size={32} color="#fff" />
                </LinearGradient>
              </Pressable>
            ) : (
              <GradientButton
                label={syncing ? "Syncing capital…" : "Sync capital from exchange"}
                onPress={onSyncCapital}
                loading={syncing}
                variant="green"
              />
            )}

            {status.nextTVip && tProgress ? (
              <View style={styles.progressCard}>
                <Text style={styles.progressTitle}>Next T-VIP → {status.nextTVip.rank}</Text>
                <ProgressBar percent={tProgress.percent} color="#5B8CFF" />
                <Text style={styles.progressPct}>
                  {formatMoney(tProgress.current, { decimals: 0 })} /{" "}
                  {formatMoney(tProgress.target, { decimals: 0 })}
                </Text>
              </View>
            ) : null}

            {status.nextCVip && cProgress ? (
              <View style={[styles.progressCard, { borderColor: "rgba(247,166,0,0.35)" }]}>
                <Text style={[styles.progressTitle, { color: "#F7A600" }]}>
                  Next C-VIP → {status.nextCVip.rank}
                </Text>
                <RequirementRow
                  label="Exchange capital"
                  metric={cProgress.deposit}
                  format="money"
                  color="#F7A600"
                />
                <RequirementRow
                  label="Direct referrals"
                  metric={cProgress.directs}
                  color="#F7A600"
                />
                <RequirementRow
                  label="Team business"
                  metric={cProgress.teamBusiness}
                  format="money"
                  color="#F7A600"
                />
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>Recent activity</Text>
            {payouts.length === 0 ? (
              <Text style={styles.empty}>No activity yet</Text>
            ) : (
              payouts.slice(0, 8).map((p) => (
                <View key={p.id} style={styles.payoutRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.payoutType}>
                      {TYPE_LABELS[p.type] || p.type}
                    </Text>
                    <Text style={styles.payoutDate}>
                      {new Date(p.createdAt).toLocaleDateString("en-IN")}
                      {p.rankAtTime ? ` · ${p.rankAtTime}` : ""}
                    </Text>
                  </View>
                  <Text style={styles.payoutAmount}>
                    {formatMoney(p.amount, { decimals: 2 })}
                  </Text>
                </View>
              ))
            )}
          </>
        ) : null}

        {/* T-VIP */}
        {tab === "T-VIP" ? (
          <>
            <LinearGradient colors={["#25356F", "#141B33"]} style={styles.planHero}>
              <MaterialCommunityIcons name="diamond-stone" size={36} color="#9BB0FF" />
              <Text style={styles.planHeroTitle}>T-VIP Strategy</Text>
              <Text style={styles.planHeroSub}>
                Income VIP — based on your personal exchange capital only. Higher capital →
                higher % of exchange profit pool. No app deposit required.
              </Text>
              {status ? (
                <Text style={styles.currentMeta}>
                  {status.tVipRank || "NONE"} · capital{" "}
                  {formatMoney(capital, { decimals: 0 })} · {status.tVipProfitSharePercent}%
                  share
                </Text>
              ) : null}
            </LinearGradient>
            <Text style={styles.sectionTitle}>How it works</Text>
            {T_VIP_STRATEGY.map((s, i) => (
              <StrategyStep
                key={s.title}
                index={i + 1}
                icon={s.icon}
                title={s.title}
                desc={s.desc}
                accent="#5B8CFF"
              />
            ))}
            <Text style={styles.sectionTitle}>T-VIP levels</Text>
            {tVipPlans.map((row) => (
              <TVipPlanCard
                key={row.rank}
                row={row}
                active={status?.tVipRank === row.rank}
              />
            ))}
          </>
        ) : null}

        {/* C-VIP */}
        {tab === "C-VIP" ? (
          <>
            <LinearGradient colors={["#5C3D0A", "#1F1608"]} style={styles.planHero}>
              <MaterialCommunityIcons name="crown" size={36} color="#F7A600" />
              <Text style={styles.planHeroTitle}>C-VIP Strategy</Text>
              <Text style={styles.planHeroSub}>
                Community VIP — exchange capital + directs + team business. Weakest condition
                caps your rank. Bonuses from C-VIP-5+.
              </Text>
            </LinearGradient>
            <Text style={styles.sectionTitle}>How it works</Text>
            {C_VIP_STRATEGY.map((s, i) => (
              <StrategyStep
                key={s.title}
                index={i + 1}
                icon={s.icon}
                title={s.title}
                desc={s.desc}
                accent="#F7A600"
              />
            ))}
            {status?.nextCVip && cProgress ? (
              <View style={[styles.progressCard, { borderColor: "rgba(247,166,0,0.35)" }]}>
                <Text style={[styles.progressTitle, { color: "#F7A600" }]}>
                  Requirements → {status.nextCVip.rank}
                </Text>
                <RequirementRow
                  label="Exchange capital"
                  metric={cProgress.deposit}
                  format="money"
                  color="#F7A600"
                />
                <RequirementRow
                  label="Direct referrals"
                  metric={cProgress.directs}
                  color="#F7A600"
                />
                <RequirementRow
                  label="Team business"
                  metric={cProgress.teamBusiness}
                  format="money"
                  color="#F7A600"
                />
              </View>
            ) : null}
            <Text style={styles.sectionTitle}>C-VIP levels</Text>
            {cVipPlans.map((row) => (
              <CVipPlanCard
                key={row.rank}
                row={row}
                active={status?.cVipRank === row.rank}
                capital={capital}
                directs={status?.directs || 0}
                teamBusiness={status?.teamBusiness || 0}
              />
            ))}
            <View style={styles.bonusCard}>
              <Text style={styles.bonusTitle}>C-VIP bonuses</Text>
              <Text style={styles.bonusLine}>
                • Same Level (C-VIP-5+): 10% when a downline first hits C-VIP-5+
              </Text>
              <Text style={styles.bonusLine}>
                • Global Dev: 20% base · C-VIP-6 → 40% · C-VIP-7 → 60%
              </Text>
            </View>
          </>
        ) : null}

        {/* CAPITAL */}
        {tab === "capital" ? (
          <>
            <LinearGradient colors={["#0F2A4A", "#12161F"]} style={styles.planHero}>
              <Ionicons name="link" size={36} color={colors.profit} />
              <Text style={styles.planHeroTitle}>Exchange capital</Text>
              <Text style={styles.planHeroSub}>
                MirrorTrade does not collect deposits or process withdrawals. You fund and
                withdraw on Binance / Bybit / OKX. We only read trade-only API balances to set
                VIP levels.
              </Text>
            </LinearGradient>

            <Text style={styles.sectionTitle}>Flow</Text>
            {[
              {
                n: "1",
                t: "Deposit on exchange",
                d: "Add funds to your exchange account (their app/website).",
              },
              {
                n: "2",
                t: "Connect trade-only API",
                d: "Key with trading + read balance. Withdrawals must be OFF.",
              },
              {
                n: "3",
                t: "Levels update",
                d: "We sync USDT capital → T-VIP / C-VIP ranks recalculate.",
              },
            ].map((s) => (
              <View key={s.n} style={styles.depositStep}>
                <View style={styles.depositStepNum}>
                  <Text style={styles.depositStepNumText}>{s.n}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.depositStepTitle}>{s.t}</Text>
                  <Text style={styles.depositStepDesc}>{s.d}</Text>
                </View>
              </View>
            ))}

            <View style={styles.summaryMiniInline}>
              <Text style={styles.summaryMiniLabel}>Current capital for VIP</Text>
              <Text style={styles.summaryMiniVal}>
                {formatMoney(capital, { decimals: 2 })}
              </Text>
            </View>

            {hasExchange ? (
              <>
                <Text style={styles.sectionTitle}>Connected</Text>
                {exchanges.map((ex) => (
                  <View key={ex.id} style={styles.exRow}>
                    <View>
                      <Text style={styles.exName}>{ex.exchange.toUpperCase()}</Text>
                      <Text style={styles.exMeta}>
                        {ex.status} · last{" "}
                        {formatMoney(ex.lastCapital ?? 0, { decimals: 2 })}
                      </Text>
                    </View>
                    <Ionicons name="checkmark-circle" size={20} color={colors.profit} />
                  </View>
                ))}
                <GradientButton
                  label={syncing ? "Syncing…" : "Sync capital now"}
                  onPress={onSyncCapital}
                  loading={syncing}
                  variant="green"
                  style={{ marginTop: 12 }}
                />
              </>
            ) : (
              <GradientButton
                label="Connect exchange API"
                onPress={() => navigation.navigate("ExchangeConnect")}
              />
            )}

            <View style={styles.altCard}>
              <Ionicons name="warning-outline" size={20} color={colors.warn} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.altTitle}>Important</Text>
                <Text style={styles.altDesc}>
                  Never enable withdrawal on API keys used with MirrorTrade. Support can set
                  capital manually only if API sync fails (admin panel).
                </Text>
              </View>
            </View>
          </>
        ) : null}

        <View style={{ height: 32 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabsWrap: { maxHeight: 52, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabsScroll: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  tabText: { color: colors.muted, fontWeight: "600", fontSize: 13 },
  tabTextActive: { color: colors.text },
  content: { padding: 16, paddingBottom: 40 },
  errorBox: {
    backgroundColor: "rgba(255,59,92,0.12)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { color: colors.loss, marginBottom: 6 },
  retry: { color: colors.primary, fontWeight: "700" },
  modelBanner: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "rgba(0,208,132,0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,208,132,0.25)",
    padding: 12,
    marginBottom: 14,
  },
  modelBannerText: { flex: 1, color: colors.muted, fontSize: 12, lineHeight: 17 },
  hero: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(91,108,255,0.25)",
    marginBottom: 16,
  },
  heroLabel: { color: colors.muted, fontSize: 13 },
  heroValue: { color: colors.text, fontSize: 32, fontWeight: "800", marginTop: 4 },
  heroMeta: { color: colors.muted, fontSize: 11, marginTop: 6 },
  heroStats: { flexDirection: "row", marginTop: 18, alignItems: "center" },
  heroStat: { flex: 1, alignItems: "center" },
  heroStatLabel: { color: colors.muted, fontSize: 11, marginBottom: 4 },
  heroStatVal: { color: colors.text, fontWeight: "700", fontSize: 14 },
  heroDivider: { width: 1, height: 28, backgroundColor: colors.border },
  rankDuo: { flexDirection: "row", gap: 12, marginBottom: 16 },
  rankCard: { flex: 1, borderRadius: 16, overflow: "hidden" },
  rankGrad: {
    padding: 16,
    alignItems: "center",
    minHeight: 140,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rankCardLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
    letterSpacing: 1,
  },
  rankCardValue: {
    color: "#9BB0FF",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 4,
    textAlign: "center",
  },
  rankCardMeta: { color: colors.muted, fontSize: 11, marginTop: 4 },
  depositCta: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  depositCtaTitle: { color: "#fff", fontWeight: "800", fontSize: 16 },
  depositCtaSub: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 4 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 12,
    marginTop: 8,
  },
  progressCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(91,108,255,0.35)",
    padding: 14,
    marginTop: 14,
    marginBottom: 14,
  },
  progressTitle: { color: colors.text, fontWeight: "800", fontSize: 15, marginBottom: 8 },
  progressPct: { color: colors.muted, fontSize: 12, marginTop: 6 },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.elevated,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 4 },
  reqRow: { marginTop: 10 },
  reqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  reqLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  reqLabel: { color: colors.text, fontSize: 13, fontWeight: "600" },
  reqValue: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  payoutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  payoutType: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 3 },
  payoutDate: { fontSize: 12, color: colors.muted },
  payoutAmount: { fontSize: 15, fontWeight: "700", color: colors.profit },
  empty: { color: colors.muted, fontSize: 14 },
  planHero: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planHeroTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 10,
  },
  planHeroSub: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 8 },
  currentMeta: { color: colors.muted, fontSize: 12, marginTop: 12 },
  strategyStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  strategyNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  strategyNumText: { fontSize: 12, fontWeight: "800" },
  strategyIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  strategyTitle: { color: colors.text, fontWeight: "700", fontSize: 14 },
  strategyDesc: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  planCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  planCardActiveT: {
    borderColor: "#5B8CFF",
    backgroundColor: "rgba(91,108,255,0.12)",
  },
  planCardActiveC: {
    borderColor: "#F7A600",
    backgroundColor: "rgba(247,166,0,0.1)",
  },
  youPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(91,108,255,0.25)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  youPillText: { color: "#9BB0FF", fontSize: 10, fontWeight: "800" },
  planCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  planRank: { color: colors.text, fontSize: 17, fontWeight: "800" },
  planMin: { color: colors.muted, fontSize: 12, marginTop: 4 },
  shareBubble: {
    backgroundColor: "rgba(0,208,132,0.12)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    minWidth: 72,
  },
  sharePct: { color: colors.profit, fontSize: 20, fontWeight: "900" },
  shareLabel: { color: colors.muted, fontSize: 9, marginTop: 2 },
  shareBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.elevated,
    marginTop: 12,
    overflow: "hidden",
  },
  shareBarFill: { height: "100%", backgroundColor: colors.profit, borderRadius: 3 },
  condGrid: { flexDirection: "row", gap: 8, marginTop: 12 },
  condBox: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 8,
    alignItems: "center",
    gap: 4,
  },
  condBoxOk: {
    backgroundColor: "rgba(0,208,132,0.1)",
    borderColor: "rgba(0,208,132,0.35)",
  },
  condBoxNo: { backgroundColor: colors.elevated, borderColor: colors.border },
  condBoxLabel: { color: colors.muted, fontSize: 10, fontWeight: "600" },
  condBoxVal: { color: colors.text, fontSize: 11, fontWeight: "700" },
  bonusCard: {
    marginTop: 8,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(247,166,0,0.3)",
    padding: 14,
  },
  bonusTitle: { color: colors.text, fontWeight: "800", marginBottom: 10, fontSize: 15 },
  bonusLine: { color: colors.muted, fontSize: 13, lineHeight: 19, marginBottom: 4 },
  depositStep: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  depositStepNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,208,132,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  depositStepNumText: { color: colors.profit, fontWeight: "900", fontSize: 14 },
  depositStepTitle: { color: colors.text, fontWeight: "700", fontSize: 14 },
  depositStepDesc: { color: colors.muted, fontSize: 12, marginTop: 2, lineHeight: 17 },
  summaryMiniInline: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 14,
  },
  summaryMiniLabel: { color: colors.muted, fontSize: 12 },
  summaryMiniVal: { color: colors.text, fontSize: 18, fontWeight: "800" },
  exRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
  },
  exName: { color: colors.text, fontWeight: "700", fontSize: 14 },
  exMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  altCard: {
    flexDirection: "row",
    marginTop: 16,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  altTitle: { color: colors.text, fontWeight: "700", fontSize: 13 },
  altDesc: { color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 17 },
});
