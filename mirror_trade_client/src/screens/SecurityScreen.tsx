import React, { useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Screen from "../components/Screen";
import AuthInput from "../components/AuthInput";
import GradientButton from "../components/GradientButton";
import { changePasswordRequest } from "../config/api";
import { useAppData } from "../context/AppDataContext";
import { useAuth } from "../context/AuthContext";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Security">;

export default function SecurityScreen({ navigation }: Props) {
  const { settings, updateSettings } = useAppData();
  const { user } = useAuth();

  // Change password modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const openModal = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setModalOpen(true);
  };

  const onChangePasswordSubmit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill all password fields");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await changePasswordRequest(currentPassword, newPassword);
      setModalOpen(false);
      Alert.alert(
        "Password Updated",
        "Your password has been changed successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to change password"
      );
    } finally {
      setSubmitting(false);
    }
  };

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
        <Text style={styles.section}>Active Device Session</Text>
        <View style={styles.session}>
          <Ionicons name="phone-portrait-outline" size={18} color={colors.primary} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.rowTitle}>This Device</Text>
            <Text style={styles.rowSub}>
              Active now · {user?.deviceId ? `ID: ${user.deviceId.slice(0, 12)}…` : "MirrorTrade App"}
            </Text>
          </View>
          <Text style={styles.active}>Active</Text>
        </View>
      </View>

      <View style={{ marginTop: 16 }}>
        <GradientButton
          label="Change Password"
          variant="ghost"
          onPress={openModal}
        />
      </View>

      {/* Change Password Modal */}
      <Modal
        visible={modalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <Pressable onPress={() => setModalOpen(false)}>
                <Ionicons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>

            <View style={{ marginTop: 14, gap: 10 }}>
              <AuthInput
                icon="key-outline"
                label="Current Password"
                placeholder="Enter current password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                showPasswordToggle
                passwordVisible={showCurrent}
                onTogglePassword={() => setShowCurrent((v) => !v)}
              />
              <AuthInput
                icon="lock-closed-outline"
                label="New Password"
                placeholder="Min. 6 characters"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                showPasswordToggle
                passwordVisible={showNew}
                onTogglePassword={() => setShowNew((v) => !v)}
              />
              <AuthInput
                icon="lock-closed-outline"
                label="Confirm New Password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={colors.loss} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={{ marginTop: 20 }}>
              <GradientButton
                label={submitting ? "Updating Password…" : "Update Password"}
                disabled={submitting}
                onPress={onChangePasswordSubmit}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  active: { fontSize: 12, fontWeight: "700", color: colors.profit },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 59, 92, 0.28)",
    backgroundColor: "rgba(255, 59, 92, 0.08)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    flex: 1,
    color: colors.loss,
    fontSize: 13,
    fontWeight: "500",
  },
});
