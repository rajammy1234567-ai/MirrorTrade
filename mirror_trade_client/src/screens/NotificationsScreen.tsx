import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Screen from "../components/Screen";
import EmptyState from "../components/EmptyState";
import { useAppData } from "../context/AppDataContext";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Notifications">;

const typeIcon: Record<string, keyof typeof Ionicons.glyphMap> = {
  trade: "swap-horizontal",
  bot: "hardware-chip-outline",
  signal: "radio-outline",
  system: "information-circle-outline",
};

export default function NotificationsScreen({ navigation }: Props) {
  const { notifications, markAllRead, markRead, unreadCount } = useAppData();

  return (
    <Screen>
      <View style={styles.nav}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={18} color={colors.text} />
        </Pressable>
        <Text style={styles.navTitle}>Notifications</Text>
        <Pressable onPress={markAllRead} hitSlop={8}>
          <Text style={styles.markAll}>
            {unreadCount > 0 ? "Mark all" : ""}
          </Text>
        </Pressable>
      </View>

      {notifications.length === 0 ? (
        <EmptyState
          icon="notifications-outline"
          title="All caught up"
          subtitle="Trade fills, bot events and signals show up here"
        />
      ) : (
        <View style={styles.list}>
          {notifications.map((n) => (
            <Pressable
              key={n.id}
              style={[styles.card, !n.read && styles.cardUnread]}
              onPress={() => markRead(n.id)}
            >
              <View style={styles.iconBox}>
                <Ionicons
                  name={typeIcon[n.type] || "notifications-outline"}
                  size={18}
                  color={colors.primary}
                />
              </View>
              <View style={styles.body}>
                <View style={styles.row}>
                  <Text style={styles.title} numberOfLines={1}>
                    {n.title}
                  </Text>
                  {!n.read ? <View style={styles.dot} /> : null}
                </View>
                <Text style={styles.text}>{n.body}</Text>
                <Text style={styles.time}>{n.time}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  nav: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
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
  markAll: { fontSize: 13, fontWeight: "600", color: colors.primary, minWidth: 60, textAlign: "right" },
  list: { gap: 10 },
  card: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
  },
  cardUnread: {
    borderColor: "rgba(91,108,255,0.35)",
    backgroundColor: "rgba(91,108,255,0.06)",
  },
  iconBox: {
    height: 40,
    width: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, marginLeft: 12 },
  row: { flexDirection: "row", alignItems: "center" },
  title: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.text },
  dot: {
    height: 8,
    width: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: 8,
  },
  text: { marginTop: 4, fontSize: 13, color: colors.muted, lineHeight: 18 },
  time: { marginTop: 6, fontSize: 11, color: colors.muted },
});
