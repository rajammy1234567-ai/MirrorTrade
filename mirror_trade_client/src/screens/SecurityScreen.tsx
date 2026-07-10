import React from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Screen from "../components/Screen";
import GradientButton from "../components/GradientButton";
import { useAppData } from "../context/AppDataContext";
import { useAuth } from "../context/AuthContext";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Security">;

export default function SecurityScreen({ navigation }: Props) {
  const { settings, updateSettings } = useAppData();
  const { user } = useAuth();

  return (
    <Screen>
      <View style={styles.nav}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={18} color={colors.text} />
        </Pressable>
        <Text style={styles.navTitle}>Security & 2FA</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.value}>{user?.email || "—"}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Authenticator 2FA</Text>
            <Text style={styles.rowSub}>
              Require 6-digit code after password login
            </Text>
          </View>
          <Switch
            value={settings.twoFAEnabled}
            onValueChange={(v) => updateSettings({ twoFAEnabled: v })}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor="#fff"
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Sessions</Text>
        <View style={styles.session}>
          <Ionicons name="phone-portrait-outline" size={18} color={colors.primary} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.rowTitle}>This device</Text>
            <Text style={styles.rowSub}>Active now · MirrorTrade app</Text>
          </View>
          <Text style={styles.active}>Active</Text>
        </View>
        <View style={[styles.session, styles.sessionBorder]}>
          <Ionicons name="desktop-outline" size={18} color={colors.muted} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.rowTitle}>Chrome · Windows</Text>
            <Text style={styles.rowSub}>Last seen 2 days ago</Text>
          </View>
          <Pressable
            onPress={() =>
              Alert.alert("Session revoked", "Remote session signed out.")
            }
          >
            <Text style={styles.revoke}>Revoke</Text>
          </Pressable>
        </View>
      </View>

      <View style={{ marginTop: 16 }}>
        <GradientButton
          label="Change Password"
          variant="ghost"
          onPress={() =>
            Alert.alert(
              "Change password",
              "Password reset link sent to your email (demo)."
            )
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  nav: {
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
  card: {
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
  },
  label: { fontSize: 12, color: colors.muted },
  value: { marginTop: 4, fontSize: 15, fontWeight: "600", color: colors.text },
  row: { flexDirection: "row", alignItems: "center" },
  rowTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  rowSub: { marginTop: 3, fontSize: 12, color: colors.muted, lineHeight: 17 },
  section: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: colors.muted,
    marginBottom: 12,
  },
  session: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  sessionBorder: {
    marginTop: 10,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  active: { fontSize: 12, fontWeight: "700", color: colors.profit },
  revoke: { fontSize: 12, fontWeight: "700", color: colors.loss },
});
