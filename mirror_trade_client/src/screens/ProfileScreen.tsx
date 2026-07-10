import React from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Screen from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { useAppData } from "../context/AppDataContext";
import { exchanges } from "../data/mock";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

const menu: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  route: keyof RootStackParamList;
}[] = [
  { icon: "shield-outline", title: "Security & 2FA", route: "Security" },
  { icon: "notifications-outline", title: "Notifications", route: "Notifications" },
  { icon: "globe-outline", title: "Language & Region", route: "Language" },
  { icon: "pulse-outline", title: "Trading Preferences", route: "TradingPrefs" },
  { icon: "help-circle-outline", title: "Help & Support", route: "Help" },
];

export default function ProfileScreen() {
  const { user, logout, exchangeConnected } = useAuth();
  const { settings, updateSettings, unreadCount } = useAppData();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const initials = (user?.name || "U")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const code = `REF-${(user?.name || "USER").slice(0, 4).toUpperCase()}2025`;

  const onLogout = async () => {
    await logout();
    const root = navigation.getParent() ?? navigation;
    root.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "Auth" }],
      })
    );
  };

  return (
    <Screen tabScreen>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.name}>{user?.name || "Trader"}</Text>
          <Text style={styles.email}>{user?.email || "—"}</Text>
          <View style={styles.kyc}>
            <Ionicons name="checkmark-circle" size={12} color={colors.profit} />
            <Text style={styles.kycText}>Connected to API</Text>
          </View>
        </View>
        <Pressable
          style={styles.settings}
          onPress={() => navigation.navigate("Security")}
        >
          <Ionicons name="settings-outline" size={18} color={colors.text} />
        </Pressable>
      </View>

      <Text style={styles.section}>CONNECTED EXCHANGES</Text>
      <View style={styles.card}>
        {exchanges.slice(0, 2).map((ex, i) => {
          const active = i === 0 ? exchangeConnected || true : false;
          return (
            <View key={ex.id} style={[styles.exRow, i > 0 && styles.exBorder]}>
              <View style={[styles.exIcon, { backgroundColor: `${ex.color}22` }]}>
                <Text style={[styles.exShort, { color: ex.color }]}>
                  {ex.short.slice(0, 3)}
                </Text>
              </View>
              <Text style={styles.exName}>{ex.name}</Text>
              <View style={styles.status}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: active ? colors.profit : colors.muted },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: active ? colors.profit : colors.muted },
                  ]}
                >
                  {active ? "Active" : "Inactive"}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <Text style={styles.section}>REFERRAL EARNINGS</Text>
      <Pressable
        style={styles.referral}
        onPress={() => navigation.navigate("Referral")}
      >
        <Text style={styles.refAmount}>$128.40</Text>
        <Text style={styles.refSub}>Earned from 8 referrals this month</Text>
        <View style={styles.refCodeRow}>
          <Text style={styles.refCode}>{code}</Text>
          <Pressable
            style={styles.copyBtn}
            onPress={() => Alert.alert("Copied", code)}
          >
            <Text style={styles.copyText}>Copy</Text>
          </Pressable>
        </View>
      </Pressable>

      <View style={styles.toggleCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.toggleTitle}>Trade notifications</Text>
          <Text style={styles.toggleSub}>
            {unreadCount} unread · manage in inbox
          </Text>
        </View>
        <Switch
          value={settings.tradeNotifications}
          onValueChange={(v) => updateSettings({ tradeNotifications: v })}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor="#fff"
        />
      </View>

      <View style={styles.menu}>
        {menu.map((item) => (
          <Pressable
            key={item.title}
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.route as never)}
          >
            <View style={styles.menuIcon}>
              <Ionicons name={item.icon} size={18} color={colors.muted} />
            </View>
            <Text style={styles.menuTitle}>{item.title}</Text>
            {item.route === "Notifications" && unreadCount > 0 ? (
              <View style={styles.menuBadge}>
                <Text style={styles.menuBadgeText}>{unreadCount}</Text>
              </View>
            ) : null}
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </Pressable>
        ))}
      </View>

      <Pressable onPress={onLogout} style={styles.logout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: 8, flexDirection: "row", alignItems: "center" },
  avatar: {
    height: 58,
    width: 58,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "700", color: colors.primary },
  name: { fontSize: 18, fontWeight: "700", color: colors.text },
  email: { marginTop: 2, fontSize: 13, color: colors.muted },
  kyc: {
    marginTop: 6,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,208,132,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  kycText: { fontSize: 11, fontWeight: "700", color: colors.profit },
  settings: {
    height: 40,
    width: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    marginTop: 22,
    marginBottom: 10,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: colors.muted,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: "hidden",
  },
  exRow: { flexDirection: "row", alignItems: "center", padding: 14 },
  exBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  exIcon: {
    height: 36,
    width: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  exShort: { fontSize: 9, fontWeight: "800" },
  exName: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  status: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { height: 7, width: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: "600" },
  referral: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
  },
  refAmount: { fontSize: 28, fontWeight: "700", color: colors.text },
  refSub: { marginTop: 4, fontSize: 12, color: colors.muted },
  refCodeRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    backgroundColor: colors.elevated,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  refCode: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
    letterSpacing: 0.5,
  },
  copyBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  copyText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },
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
  menu: { marginTop: 18, gap: 8 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
  },
  menuIcon: {
    height: 36,
    width: 36,
    borderRadius: 10,
    backgroundColor: colors.elevated,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTitle: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  menuBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    paddingHorizontal: 6,
  },
  menuBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  logout: {
    marginTop: 20,
    marginBottom: 8,
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,59,92,0.35)",
    backgroundColor: "rgba(255,59,92,0.08)",
    paddingVertical: 14,
  },
  logoutText: { fontSize: 14, fontWeight: "700", color: colors.loss },
});
