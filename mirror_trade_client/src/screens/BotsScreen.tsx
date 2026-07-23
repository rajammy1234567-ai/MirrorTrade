import React, { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Screen from "../components/Screen";
import PnlText from "../components/PnlText";
import { useAppData } from "../context/AppDataContext";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import type { Bot } from "../data/mock";

type MainTab = "Running" | "Stopped" | "Record";
type MarketFilter = "Last24H" | "All" | "Spot" | "Futures";
type StoppedFilter = "Normally" | "Automatically";
type SortKey = "name" | "pnl" | "position" | "unrealized" | "roi" | "maxPos";

const MAIN_TABS: MainTab[] = ["Running", "Stopped", "Record"];
const MARKET_CHIPS: { key: MarketFilter; label: string }[] = [
  { key: "Last24H", label: "Last 24H" },
  { key: "All", label: "All" },
  { key: "Spot", label: "Spot" },
  { key: "Futures", label: "Futures" },
];

const HOLDING_CLASSES = [
  { key: "A", label: "Class A", color: "#22C55E" },
  { key: "B", label: "Class B", color: "#3B82F6" },
  { key: "C", label: "Class C", color: "#F5A524" },
  { key: "D", label: "Class D", color: "#EC4899" },
] as const;

export default function BotsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { bots, pauseBot, stopBot, resumeStoppedBot } = useAppData();

  const [mainTab, setMainTab] = useState<MainTab>("Running");
  const [marketFilter, setMarketFilter] = useState<MarketFilter>("All");
  const [stoppedFilter, setStoppedFilter] =
    useState<StoppedFilter>("Normally");
  const [sortKey, setSortKey] = useState<SortKey>("pnl");
  const [sortAsc, setSortAsc] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const runningBots = useMemo(
    () => bots.filter((b) => !b.stopped),
    [bots]
  );
  const stoppedBots = useMemo(
    () => bots.filter((b) => b.stopped),
    [bots]
  );

  const filteredRunning = useMemo(() => {
    let list = runningBots;
    if (marketFilter === "Spot") {
      list = list.filter((b) => b.market === "Spot");
    } else if (marketFilter === "Futures") {
      list = list.filter((b) => b.market === "Futures");
    } else if (marketFilter === "Last24H") {
      list = list.filter((b) => (b.lastActiveHours ?? 99) <= 24);
    }
    return sortBots(list, sortKey, sortAsc);
  }, [runningBots, marketFilter, sortKey, sortAsc]);

  const filteredStopped = useMemo(() => {
    const list = stoppedBots.filter(
      (b) => (b.stopMode ?? "Normally") === stoppedFilter
    );
    return sortBots(list, sortKey === "unrealized" ? "roi" : sortKey, sortAsc);
  }, [stoppedBots, stoppedFilter, sortKey, sortAsc]);

  /** Stats follow the active market filter (same list user sees) */
  const stats = useMemo(() => {
    const active = filteredRunning;
    const spot = active.filter((b) => b.market === "Spot");
    const futures = active.filter((b) => b.market === "Futures");
    const sum = (
      arr: Bot[],
      key: "pnl" | "investment" | "unrealizedPnl" | "position"
    ) => arr.reduce((a, b) => a + (Number(b[key]) || 0), 0);

    const longF = futures.filter((b) => (b.side ?? "long") === "long");
    const shortF = futures.filter((b) => b.side === "short");

    return {
      spotCount: spot.length,
      futuresCount: futures.length,
      spotPos: sum(spot, "position"),
      futuresPos: sum(futures, "position"),
      spotPnl: sum(spot, "pnl"),
      futuresPnl: sum(futures, "pnl"),
      spotUnreal: sum(spot, "unrealizedPnl"),
      futuresUnreal: sum(futures, "unrealizedPnl"),
      longCount: longF.length,
      shortCount: shortF.length,
      longPnl: sum(longF, "pnl"),
      shortPnl: sum(shortF, "pnl"),
      longUnreal: sum(longF, "unrealizedPnl"),
      shortUnreal: sum(shortF, "unrealizedPnl"),
      longMargin: sum(longF, "investment"),
      shortMargin: sum(shortF, "investment"),
      totalInvest: sum(active, "investment"),
      classShares: classShares(spot),
    };
  }, [filteredRunning]);

  const stoppedStats = useMemo(() => {
    const list = filteredStopped;
    const profitCount = list.filter((b) => b.pnl > 0).length;
    const winRate =
      list.length === 0 ? 0 : Math.round((profitCount / list.length) * 100);
    return {
      profitCount,
      manualClose: stoppedBots.filter((b) => b.stopMode === "Normally").length,
      winRate,
    };
  }, [filteredStopped, stoppedBots]);

  const records = useMemo(() => {
    return sortBots(
      [...stoppedBots],
      sortKey === "position" || sortKey === "maxPos" ? "pnl" : sortKey,
      sortAsc
    );
  }, [stoppedBots, sortKey, sortAsc]);

  const onSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const confirmStop = (bot: Bot) => {
    Alert.alert(
      "Stop bot",
      `Stop ${bot.name}? It will move to the Stopped tab.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Stop",
          style: "destructive",
          onPress: () => {
            stopBot(bot.id);
            setMainTab("Stopped");
            setStoppedFilter("Normally");
          },
        },
      ]
    );
  };

  const confirmRestart = (bot: Bot) => {
    Alert.alert(
      "Restart bot",
      `Restart ${bot.name}? It will return to Running.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restart",
          onPress: () => {
            resumeStoppedBot(bot.id);
            setMainTab("Running");
            setMarketFilter("All");
          },
        },
      ]
    );
  };

  return (
    <Screen tabScreen>
      {/* ── Top tabs ── */}
      <View style={styles.topBar}>
        <View style={styles.mainTabs}>
          {MAIN_TABS.map((tab) => {
            const active = mainTab === tab;
            const count =
              tab === "Running"
                ? runningBots.length
                : tab === "Stopped"
                  ? stoppedBots.length
                  : records.length;
            return (
              <Pressable
                key={tab}
                onPress={() => setMainTab(tab)}
                style={styles.mainTab}
              >
                <Text
                  style={[
                    styles.mainTabText,
                    active && styles.mainTabTextActive,
                  ]}
                >
                  {tab}
                  {count > 0 && tab !== "Record" ? (
                    <Text style={styles.tabCount}> {count}</Text>
                  ) : null}
                </Text>
                {active ? <View style={styles.mainTabUnderline} /> : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.topIcons}>
          <Pressable
            style={styles.iconBtn}
            hitSlop={8}
            onPress={() => navigation.navigate("Signals")}
          >
            <Ionicons
              name="document-text-outline"
              size={18}
              color={colors.muted}
            />
          </Pressable>
          <Pressable
            style={styles.iconBtn}
            hitSlop={8}
            onPress={() => navigation.navigate("Security")}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color={colors.muted}
            />
          </Pressable>
          <Pressable
            style={styles.iconBtn}
            hitSlop={8}
            onPress={() => navigation.navigate("TradingPrefs")}
          >
            <Ionicons name="options-outline" size={18} color={colors.muted} />
          </Pressable>
        </View>
      </View>

      {/* ═══════════ RUNNING ═══════════ */}
      {mainTab === "Running" ? (
        <>
          <View style={styles.chipRow}>
            <View style={styles.chips}>
              {MARKET_CHIPS.map((c) => {
                const active = marketFilter === c.key;
                return (
                  <Pressable
                    key={c.key}
                    onPress={() => setMarketFilter(c.key)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text
                      style={[styles.chipText, active && styles.chipTextActive]}
                    >
                      {c.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={() => setShowMore((v) => !v)}
              style={styles.moreBtn}
            >
              <Text style={styles.moreText}>More</Text>
              <Ionicons
                name={showMore ? "chevron-up" : "chevron-down"}
                size={12}
                color="#5B8CFF"
              />
            </Pressable>
          </View>

          {showMore ? (
            <View style={styles.morePanel}>
              <Pressable
                style={styles.moreItem}
                onPress={() => navigation.navigate("TradingPrefs")}
              >
                <Ionicons
                  name="options-outline"
                  size={16}
                  color={colors.muted}
                />
                <Text style={styles.moreItemText}>Trading preferences</Text>
              </Pressable>
              <Pressable
                style={styles.moreItem}
                onPress={() => navigation.navigate("ExchangeConnect")}
              >
                <Ionicons name="link-outline" size={16} color={colors.muted} />
                <Text style={styles.moreItemText}>API / Exchange connect</Text>
              </Pressable>
              <Pressable
                style={styles.moreItem}
                onPress={() => navigation.navigate("Help")}
              >
                <Ionicons
                  name="help-circle-outline"
                  size={16}
                  color={colors.muted}
                />
                <Text style={styles.moreItemText}>Bot help</Text>
              </Pressable>
            </View>
          ) : null}

          {marketFilter === "All" || marketFilter === "Last24H" ? (
            <View style={styles.summaryCard}>
              <SummaryMarketRow
                label="Spot"
                eye
                count={stats.spotCount}
                cols={[
                  { title: "Position", value: fmtNum(stats.spotPos) },
                  {
                    title: "Total PnL",
                    value: fmtPnl(stats.spotPnl),
                    color: pnlColor(stats.spotPnl),
                  },
                  {
                    title: "Unrealized PNL",
                    value: fmtPnl(stats.spotUnreal),
                    color: pnlColor(stats.spotUnreal),
                  },
                ]}
              />
              <View style={styles.summaryDivider} />
              <SummaryMarketRow
                label="Futures"
                eye
                count={stats.futuresCount}
                cols={[
                  { title: "Position", value: fmtNum(stats.futuresPos) },
                  {
                    title: "Total PnL",
                    value: fmtPnl(stats.futuresPnl),
                    color: pnlColor(stats.futuresPnl),
                  },
                  {
                    title: "Unrealized PNL",
                    value: fmtPnl(stats.futuresUnreal),
                    color: pnlColor(stats.futuresUnreal),
                  },
                ]}
              />
            </View>
          ) : null}

          {marketFilter === "Spot" ? (
            <View style={styles.summaryCard}>
              <Text style={styles.holdingsTitle}>
                Bot Holdings(Spot) <Text style={styles.qMark}>?</Text>
              </Text>
              <View style={styles.holdingsRow}>
                <View style={styles.donutWrap}>
                  <DonutPlaceholder shares={stats.classShares} />
                  <Text style={styles.donutLabel}>Coins</Text>
                </View>
                <View style={styles.classGrid}>
                  {HOLDING_CLASSES.map((c, i) => (
                    <View key={c.key} style={styles.classItem}>
                      <View
                        style={[styles.classDot, { backgroundColor: c.color }]}
                      />
                      <View>
                        <Text style={styles.className}>{c.label}</Text>
                        <Text style={styles.classPct}>
                          {stats.classShares[i].toFixed(2)}%
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
                <View style={styles.holdingsRight}>
                  <Text style={styles.statTiny}>Positions</Text>
                  <Text style={styles.statVal}>{fmtNum(stats.spotPos)}u</Text>
                  <Text style={[styles.statTiny, { marginTop: 10 }]}>
                    Invested
                  </Text>
                  <Text style={styles.statVal}>
                    ₹{Math.round(stats.totalInvest).toLocaleString("en-IN")}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          {marketFilter === "Futures" ? (
            <View style={styles.summaryCard}>
              <SummaryMarketRow
                label="Long"
                eye
                count={stats.longCount}
                labelColor={colors.profit}
                cols={[
                  {
                    title: "Margin",
                    value: `${fmtNum(stats.longMargin)}u`,
                  },
                  {
                    title: "Total PnL",
                    value: fmtPnl(stats.longPnl),
                    color: pnlColor(stats.longPnl),
                  },
                  {
                    title: "Unrealized PnL",
                    value: fmtPnl(stats.longUnreal),
                    color: pnlColor(stats.longUnreal),
                  },
                ]}
              />
              <View style={styles.summaryDivider} />
              <SummaryMarketRow
                label="Short"
                eye
                count={stats.shortCount}
                labelColor={colors.loss}
                cols={[
                  {
                    title: "Margin",
                    value: `${fmtNum(stats.shortMargin)}u`,
                  },
                  {
                    title: "Total PnL",
                    value: fmtPnl(stats.shortPnl),
                    color: pnlColor(stats.shortPnl),
                  },
                  {
                    title: "Unrealized PnL",
                    value: fmtPnl(stats.shortUnreal),
                    color: pnlColor(stats.shortUnreal),
                  },
                ]}
              />
            </View>
          ) : null}

          <TableHeader
            cols={[
              { key: "name", label: "Name", flex: 1.1 },
              { key: "pnl", label: "PnL", flex: 0.9 },
              { key: "position", label: "Position", flex: 1 },
              { key: "unrealized", label: "Unrealized PNL", flex: 1.2 },
            ]}
            sortKey={sortKey}
            sortAsc={sortAsc}
            onSort={onSort}
          />

          {filteredRunning.length === 0 ? (
            <EmptyData
              hint={
                marketFilter === "Last24H"
                  ? "No bots active in the last 24 hours"
                  : marketFilter === "Spot" || marketFilter === "Futures"
                    ? `No ${marketFilter} bots running`
                    : "No running bots"
              }
            />
          ) : (
            <View style={styles.list}>
              {filteredRunning.map((bot) => (
                <BotRow
                  key={bot.id}
                  bot={bot}
                  mode="running"
                  onPress={() =>
                    navigation.navigate("BotDetail", { botId: bot.id })
                  }
                  onPause={() => pauseBot(bot.id)}
                  onStop={() => confirmStop(bot)}
                />
              ))}
            </View>
          )}
        </>
      ) : null}

      {/* ═══════════ STOPPED ═══════════ */}
      {mainTab === "Stopped" ? (
        <>
          <View style={styles.chipRow}>
            <View style={styles.chips}>
              {(["Normally", "Automatically"] as const).map((f) => {
                const active = stoppedFilter === f;
                const n = stoppedBots.filter(
                  (b) => (b.stopMode ?? "Normally") === f
                ).length;
                return (
                  <Pressable
                    key={f}
                    onPress={() => setStoppedFilter(f)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text
                      style={[styles.chipText, active && styles.chipTextActive]}
                    >
                      {f}
                      {n > 0 ? ` (${n})` : ""}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.stoppedStats}>
              <View style={styles.stoppedStat}>
                <Text style={styles.statTiny}>Profit Count</Text>
                <Text style={styles.statValLg}>{stoppedStats.profitCount}</Text>
              </View>
              <View style={styles.stoppedStat}>
                <Text style={styles.statTiny}>Manual Close Count</Text>
                <Text style={styles.statValLg}>
                  {stoppedStats.manualClose}
                </Text>
              </View>
              <View style={styles.stoppedStat}>
                <Text style={styles.statTiny}>Bot Win Rate</Text>
                <Text style={styles.statValLg}>{stoppedStats.winRate}%</Text>
              </View>
            </View>
            <Text style={styles.noteText}>
              Note: Data starts from 2025-04-10
            </Text>
          </View>

          <TableHeader
            cols={[
              { key: "name", label: "Name", flex: 1.2 },
              { key: "pnl", label: "PnL", flex: 1 },
              { key: "maxPos", label: "Max Positions", flex: 1.2 },
              { key: "roi", label: "ROI", flex: 0.9 },
            ]}
            sortKey={sortKey}
            sortAsc={sortAsc}
            onSort={onSort}
          />

          {filteredStopped.length === 0 ? (
            <EmptyData hint={`No bots stopped ${stoppedFilter.toLowerCase()}`} />
          ) : (
            <View style={styles.list}>
              {filteredStopped.map((bot) => (
                <BotRow
                  key={bot.id}
                  bot={bot}
                  mode="stopped"
                  onPress={() =>
                    navigation.navigate("BotDetail", { botId: bot.id })
                  }
                  onRestart={() => confirmRestart(bot)}
                />
              ))}
            </View>
          )}
        </>
      ) : null}

      {/* ═══════════ RECORD ═══════════ */}
      {mainTab === "Record" ? (
        <>
          <TableHeader
            cols={[
              { key: "name", label: "Name", flex: 1.2 },
              { key: "pnl", label: "Final PnL", flex: 1 },
              { key: "roi", label: "ROI", flex: 0.9 },
              { key: "maxPos", label: "Closed", flex: 1.1 },
            ]}
            sortKey={sortKey}
            sortAsc={sortAsc}
            onSort={onSort}
          />

          {records.length === 0 ? (
            <EmptyData hint="Closed bot sessions will appear here" />
          ) : (
            <View style={styles.list}>
              {records.map((bot) => (
                <Pressable
                  key={bot.id}
                  style={styles.recordCard}
                  onPress={() =>
                    navigation.navigate("BotDetail", { botId: bot.id })
                  }
                >
                  <View style={styles.recordTop}>
                    <View style={styles.botIdentity}>
                      <View
                        style={[
                          styles.botBadge,
                          {
                            backgroundColor:
                              bot.market === "Futures"
                                ? "rgba(245, 165, 36, 0.15)"
                                : "rgba(91, 140, 255, 0.15)",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.botBadgeText,
                            {
                              color:
                                bot.market === "Futures"
                                  ? colors.warn
                                  : "#5B8CFF",
                            },
                          ]}
                        >
                          {bot.market === "Futures" ? "F" : "S"}
                        </Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.botName} numberOfLines={1}>
                          {bot.name}
                        </Text>
                        <Text style={styles.botMeta} numberOfLines={1}>
                          {bot.pair} · {bot.type} ·{" "}
                          {bot.stopMode ?? "Normally"}
                        </Text>
                      </View>
                    </View>
                    <PnlText value={bot.pnl} prefix="₹" size="sm" />
                  </View>
                  <View style={styles.recordBottom}>
                    <Text style={styles.recordTime}>
                      {bot.stoppedAt ?? "—"}
                    </Text>
                    <PnlText value={bot.pnlPct} suffix="%" size="sm" />
                    <Text style={styles.recordRuntime}>{bot.runtime}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </>
      ) : null}
    </Screen>
  );
}

/* ─── Subcomponents ─── */

function SummaryMarketRow({
  label,
  count,
  cols,
  eye,
  labelColor,
}: {
  label: string;
  count: number;
  cols: { title: string; value: string; color?: string }[];
  eye?: boolean;
  labelColor?: string;
}) {
  return (
    <View style={styles.summaryRow}>
      <View style={styles.summaryLeft}>
        <Text
          style={[
            styles.summaryLabel,
            labelColor ? { color: labelColor } : null,
          ]}
        >
          {label}
          <Text style={styles.summaryCount}>({count})</Text>
        </Text>
        {eye ? (
          <Ionicons
            name="eye-outline"
            size={13}
            color={colors.muted}
            style={{ marginTop: 2 }}
          />
        ) : null}
      </View>
      {cols.map((c) => (
        <View key={c.title} style={styles.summaryCol}>
          <Text style={styles.statTiny}>{c.title}</Text>
          <Text style={[styles.statVal, c.color ? { color: c.color } : null]}>
            {c.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

function TableHeader({
  cols,
  sortKey,
  sortAsc,
  onSort,
}: {
  cols: { key: SortKey; label: string; flex: number }[];
  sortKey: SortKey;
  sortAsc: boolean;
  onSort: (k: SortKey) => void;
}) {
  return (
    <View style={styles.tableHeader}>
      {cols.map((c) => {
        const active = sortKey === c.key;
        return (
          <Pressable
            key={c.key}
            style={[styles.th, { flex: c.flex }]}
            onPress={() => onSort(c.key)}
          >
            <Text style={[styles.thText, active && styles.thTextActive]}>
              {c.label}
            </Text>
            <Ionicons
              name={
                active
                  ? sortAsc
                    ? "arrow-up"
                    : "arrow-down"
                  : "swap-vertical"
              }
              size={11}
              color={active ? colors.primary : colors.muted}
            />
          </Pressable>
        );
      })}
      <Ionicons
        name="swap-horizontal-outline"
        size={14}
        color={colors.muted}
        style={{ marginLeft: 4 }}
      />
    </View>
  );
}

function BotRow({
  bot,
  mode,
  onPress,
  onPause,
  onStop,
  onRestart,
}: {
  bot: Bot;
  mode: "running" | "stopped";
  onPress: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onRestart?: () => void;
}) {
  const isFutures = bot.market === "Futures";
  return (
    <Pressable style={styles.botCard} onPress={onPress}>
      <View style={styles.botMain}>
        <View style={styles.botIdentity}>
          <View
            style={[
              styles.botBadge,
              {
                backgroundColor: isFutures
                  ? "rgba(245, 165, 36, 0.15)"
                  : "rgba(91, 140, 255, 0.15)",
              },
            ]}
          >
            <Text
              style={[
                styles.botBadgeText,
                { color: isFutures ? colors.warn : "#5B8CFF" },
              ]}
            >
              {bot.market === "Futures" ? "F" : "S"}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.nameRow}>
              <Text style={styles.botName} numberOfLines={1}>
                {bot.name}
              </Text>
              {mode === "running" && !bot.running ? (
                <View style={styles.pausedPill}>
                  <Text style={styles.pausedPillText}>Paused</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.botMeta} numberOfLines={1}>
              {bot.pair} · {bot.type}
              {mode === "running"
                ? bot.running
                  ? ` · ${bot.runtime}`
                  : ""
                : ` · ${bot.stopMode ?? "Normally"}`}
              {bot.side ? ` · ${bot.side.toUpperCase()}` : ""}
            </Text>
          </View>
        </View>

        <View style={styles.botCols}>
          <View style={styles.botCol}>
            <PnlText value={bot.pnl} prefix="₹" size="sm" />
          </View>
          <View style={styles.botCol}>
            <Text style={styles.botColVal}>
              {mode === "stopped"
                ? fmtNum(bot.investment)
                : fmtNum(bot.position ?? 0)}
            </Text>
          </View>
          <View style={styles.botCol}>
            {mode === "stopped" ? (
              <PnlText value={bot.pnlPct} suffix="%" size="sm" />
            ) : (
              <PnlText value={bot.unrealizedPnl ?? 0} prefix="₹" size="sm" />
            )}
          </View>
        </View>
      </View>

      {mode === "running" ? (
        <View style={styles.botActions}>
          <Pressable style={styles.actionBtn} onPress={onPause}>
            <Ionicons
              name={bot.running ? "pause" : "play"}
              size={13}
              color={colors.muted}
            />
            <Text style={styles.actionText}>
              {bot.running ? "Pause" : "Resume"}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, styles.stopBtn]}
            onPress={onStop}
          >
            <Ionicons name="close" size={13} color={colors.loss} />
            <Text style={styles.stopText}>Stop</Text>
          </Pressable>
          <View style={styles.investPill}>
            <Text style={styles.investText}>
              ₹{bot.investment.toLocaleString("en-IN")}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.botActions}>
          <Pressable style={styles.actionBtn} onPress={onRestart}>
            <Ionicons name="play" size={13} color={colors.profit} />
            <Text style={[styles.actionText, { color: colors.profit }]}>
              Restart
            </Text>
          </Pressable>
          <Text style={styles.recordTime}>{bot.stoppedAt ?? "—"}</Text>
          <View style={styles.investPill}>
            <Text style={styles.investText}>Final</Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

function EmptyData({ hint }: { hint?: string }) {
  return (
    <View style={styles.emptyWrap}>
      <MaterialCommunityIcons
        name="inbox-outline"
        size={56}
        color="rgba(148,163,184,0.35)"
      />
      <Text style={styles.emptyText}>No Data</Text>
      {hint ? <Text style={styles.emptyHint}>{hint}</Text> : null}
    </View>
  );
}

function DonutPlaceholder({ shares }: { shares: number[] }) {
  const segs = HOLDING_CLASSES;
  return (
    <View style={styles.donut}>
      {segs.map((s, i) => (
        <View
          key={s.key}
          style={[
            styles.donutSeg,
            {
              borderColor: shares[i] > 0 ? s.color : "rgba(148,163,184,0.2)",
              transform: [{ rotate: `${i * 90}deg` }],
            },
          ]}
        />
      ))}
      <View style={styles.donutHole} />
    </View>
  );
}

/* ─── helpers ─── */

function classShares(spot: Bot[]): number[] {
  const total = spot.reduce((a, b) => a + b.investment, 0);
  if (total <= 0 || spot.length === 0) return [0, 0, 0, 0];
  // Map bots into A/B/C/D buckets by investment rank
  const sorted = [...spot].sort((a, b) => b.investment - a.investment);
  const buckets = [0, 0, 0, 0];
  sorted.forEach((b, i) => {
    buckets[Math.min(i, 3)] += (b.investment / total) * 100;
  });
  return buckets;
}

function sortBots(list: Bot[], key: SortKey, asc: boolean): Bot[] {
  const mul = asc ? 1 : -1;
  return [...list].sort((a, b) => {
    switch (key) {
      case "name":
        return mul * a.name.localeCompare(b.name);
      case "pnl":
        return mul * (a.pnl - b.pnl);
      case "position":
      case "maxPos":
        return mul * ((a.position ?? a.investment) - (b.position ?? b.investment));
      case "unrealized":
        return mul * ((a.unrealizedPnl ?? 0) - (b.unrealizedPnl ?? 0));
      case "roi":
        return mul * (a.pnlPct - b.pnlPct);
      default:
        return 0;
    }
  });
}

function fmtNum(n: number) {
  if (Math.abs(n) >= 1000)
    return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(n < 1 && n !== 0 ? 4 : 2);
}

function fmtPnl(n: number) {
  if (n === 0) return "0";
  return `${n.toFixed(n % 1 === 0 ? 0 : 3)}${Math.abs(n) < 100 ? "u" : ""}`;
}

function pnlColor(n: number) {
  if (n > 0) return colors.profit;
  if (n < 0) return colors.loss;
  return colors.text;
}

/* ─── styles ─── */

const styles = StyleSheet.create({
  topBar: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  mainTabs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  mainTab: {
    paddingBottom: 8,
    position: "relative",
  },
  mainTabText: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.muted,
  },
  mainTabTextActive: {
    fontWeight: "700",
    color: colors.text,
  },
  tabCount: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
  mainTabUnderline: {
    position: "absolute",
    bottom: 0,
    left: 2,
    right: 2,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  topIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingTop: 2,
  },
  iconBtn: { padding: 2 },

  chipRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    flex: 1,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.elevated,
  },
  chipActive: {
    backgroundColor: "#F5E6A8",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
  chipTextActive: {
    color: "#1A1B26",
    fontWeight: "700",
  },
  moreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingLeft: 8,
  },
  moreText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#5B8CFF",
  },
  morePanel: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 8,
    gap: 2,
  },
  moreItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  moreItemText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },

  summaryCard: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  summaryLeft: {
    width: 72,
    marginRight: 4,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  summaryCount: {
    fontWeight: "500",
    color: colors.muted,
  },
  summaryCol: { flex: 1 },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  statTiny: {
    fontSize: 11,
    color: colors.muted,
    marginBottom: 4,
  },
  statVal: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  statValLg: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginTop: 2,
  },

  holdingsTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 12,
  },
  qMark: { color: colors.muted, fontSize: 12 },
  holdingsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  donutWrap: {
    width: 72,
    alignItems: "center",
  },
  donut: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  donutSeg: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 6,
    borderTopColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "transparent",
  },
  donutHole: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
  },
  donutLabel: {
    marginTop: 4,
    fontSize: 10,
    color: colors.muted,
  },
  classGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
  },
  classItem: {
    width: "50%",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  classDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  className: { fontSize: 11, color: colors.muted },
  classPct: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text,
  },
  holdingsRight: { width: 78 },

  stoppedStats: { flexDirection: "row" },
  stoppedStat: { flex: 1 },
  noteText: {
    marginTop: 12,
    fontSize: 11,
    color: colors.muted,
  },

  tableHeader: {
    marginTop: 14,
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  th: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  thText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "500",
  },
  thTextActive: { color: colors.primary },

  list: {
    gap: 10,
    marginTop: 4,
    paddingBottom: 8,
  },
  botCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 12,
  },
  botMain: { gap: 10 },
  botIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  botBadge: {
    height: 32,
    width: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  botBadgeText: {
    fontSize: 13,
    fontWeight: "800",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  botName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    flexShrink: 1,
  },
  pausedPill: {
    backgroundColor: "rgba(148,163,184,0.18)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pausedPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.muted,
  },
  botMeta: {
    marginTop: 2,
    fontSize: 11,
    color: colors.muted,
  },
  botCols: {
    flexDirection: "row",
    paddingLeft: 42,
  },
  botCol: { flex: 1 },
  botColVal: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  botActions: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  stopBtn: {
    borderColor: "rgba(255, 59, 92, 0.28)",
    backgroundColor: "rgba(255, 59, 92, 0.08)",
  },
  actionText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text,
  },
  stopText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.loss,
  },
  investPill: {
    marginLeft: "auto",
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  investText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },

  recordCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 12,
  },
  recordTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  recordBottom: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recordTime: {
    fontSize: 11,
    color: colors.muted,
    flex: 1,
  },
  recordRuntime: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted,
  },

  emptyWrap: {
    marginTop: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.muted,
  },
  emptyHint: {
    marginTop: 6,
    fontSize: 12,
    color: "rgba(148,163,184,0.7)",
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
