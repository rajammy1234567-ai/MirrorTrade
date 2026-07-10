import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Screen from "../components/Screen";
import SectionHeader from "../components/SectionHeader";
import PnlText from "../components/PnlText";
import EmptyState from "../components/EmptyState";
import { useAppData } from "../context/AppDataContext";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

const botTypes = [
  {
    type: "Grid" as const,
    title: "Grid Bot",
    desc: "Buy low, sell high automatically within a set price range",
    icon: "layers-outline" as const,
    accent: colors.primary,
    accentSoft: colors.primarySoft,
  },
  {
    type: "DCA" as const,
    title: "DCA Bot",
    desc: "Dollar-cost average into any asset on a fixed schedule",
    icon: "trending-up" as const,
    accent: colors.profit,
    accentSoft: "rgba(0, 208, 132, 0.12)",
  },
];

export default function BotsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { bots, pauseBot, stopBot } = useAppData();

  return (
    <Screen tabScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Bot Trading</Text>
        <Pressable
          style={styles.addBtn}
          onPress={() => navigation.navigate("CreateBot")}
        >
          <Ionicons name="add" size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.typeRow}>
        {botTypes.map((b) => (
          <View key={b.type} style={styles.typeCard}>
            <View style={[styles.typeIcon, { backgroundColor: b.accentSoft }]}>
              <Ionicons name={b.icon} size={22} color={b.accent} />
            </View>
            <Text style={styles.typeTitle}>{b.title}</Text>
            <Text style={styles.typeDesc}>{b.desc}</Text>
            <Pressable
              style={[
                styles.createBtn,
                {
                  backgroundColor: b.accentSoft,
                  borderColor: `${b.accent}40`,
                },
              ]}
              onPress={() => navigation.navigate("CreateBot", { type: b.type })}
            >
              <Text style={[styles.createBtnText, { color: b.accent }]}>
                Create Bot
              </Text>
            </Pressable>
          </View>
        ))}
      </View>

      <SectionHeader
        title="Active Bots"
        actionLabel="Signals"
        onAction={() => navigation.navigate("Signals")}
      />
      <View style={styles.list}>
        {bots.length === 0 ? (
          <EmptyState
            icon="hardware-chip-outline"
            title="No active bots"
            subtitle="Create a Grid or DCA bot to start automating"
          />
        ) : (
          bots.map((bot) => {
            const isGrid = bot.type === "Grid";
            const accent = isGrid ? colors.primary : colors.profit;
            const accentSoft = isGrid
              ? colors.primarySoft
              : "rgba(0, 208, 132, 0.12)";

            return (
              <View key={bot.id} style={styles.botCard}>
                <View style={styles.botTop}>
                  <View style={[styles.botIcon, { backgroundColor: accentSoft }]}>
                    <Ionicons
                      name={isGrid ? "layers-outline" : "trending-up"}
                      size={18}
                      color={accent}
                    />
                  </View>
                  <View style={styles.botMid}>
                    <Text style={styles.botName}>{bot.name}</Text>
                    <Text style={styles.botMeta}>
                      {bot.pair} · {bot.runtime}
                      {bot.running ? "" : " · Paused"}
                    </Text>
                  </View>
                  <View style={styles.botPnl}>
                    <PnlText value={bot.pnlPct} suffix="%" size="md" />
                    <PnlText value={bot.pnl} prefix="$" size="sm" bold={false} />
                  </View>
                </View>

                <View style={styles.botActions}>
                  <Pressable
                    style={styles.actionBtn}
                    onPress={() => pauseBot(bot.id)}
                  >
                    <Ionicons
                      name={bot.running ? "pause" : "play"}
                      size={14}
                      color={colors.muted}
                    />
                    <Text style={styles.actionText}>
                      {bot.running ? "Pause" : "Resume"}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, styles.stopBtn]}
                    onPress={() =>
                      Alert.alert("Stop bot", `Stop ${bot.name}?`, [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Stop",
                          style: "destructive",
                          onPress: () => stopBot(bot.id),
                        },
                      ])
                    }
                  >
                    <Ionicons name="close" size={14} color={colors.loss} />
                    <Text style={styles.stopText}>Stop</Text>
                  </Pressable>
                  <Pressable
                    style={styles.detailsBtn}
                    onPress={() =>
                      navigation.navigate("BotDetail", { botId: bot.id })
                    }
                  >
                    <Text style={styles.detailsText}>Details</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}

        <Pressable
          style={styles.emptyBot}
          onPress={() => navigation.navigate("CreateBot")}
        >
          <View style={styles.emptyIcon}>
            <Ionicons
              name="hardware-chip-outline"
              size={24}
              color={colors.muted}
            />
          </View>
          <Text style={styles.emptyText}>
            Create a new bot to automate your trading strategy
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 26, fontWeight: "700", color: colors.text },
  addBtn: {
    height: 40,
    width: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
    alignItems: "center",
    justifyContent: "center",
  },
  typeRow: { marginTop: 18, flexDirection: "row", gap: 12 },
  typeCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
  },
  typeIcon: {
    height: 44,
    width: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  typeTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  typeDesc: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
    minHeight: 52,
  },
  createBtn: {
    marginTop: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 11,
  },
  createBtnText: { fontSize: 13, fontWeight: "700" },
  list: { gap: 12 },
  botCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
  },
  botTop: { flexDirection: "row", alignItems: "center" },
  botIcon: {
    height: 40,
    width: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  botMid: { flex: 1, marginLeft: 10, marginRight: 8, minWidth: 0 },
  botName: { fontSize: 14, fontWeight: "700", color: colors.text },
  botMeta: { marginTop: 2, fontSize: 12, color: colors.muted },
  botPnl: { alignItems: "flex-end" },
  botActions: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  stopBtn: {
    borderColor: "rgba(255, 59, 92, 0.28)",
    backgroundColor: "rgba(255, 59, 92, 0.08)",
  },
  actionText: { fontSize: 12, fontWeight: "600", color: colors.text },
  stopText: { fontSize: 12, fontWeight: "600", color: colors.loss },
  detailsBtn: {
    marginLeft: "auto",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  detailsText: { fontSize: 12, fontWeight: "600", color: colors.muted },
  emptyBot: {
    marginTop: 2,
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    height: 48,
    width: 48,
    borderRadius: 14,
    backgroundColor: colors.elevated,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    marginTop: 12,
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 18,
  },
});
