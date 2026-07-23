import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../theme/colors";

type Variant = "primary" | "green" | "ghost" | "danger";

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  size?: "md" | "sm";
  variant?: Variant;
};

export default function GradientButton({
  label,
  onPress,
  loading,
  disabled,
  style,
  size = "md",
  variant = "primary",
}: Props) {
  const padV = size === "sm" ? 11 : 15;
  const fontSize = size === "sm" ? 13 : 15;
  const radius = size === "sm" ? 12 : 14;

  if (variant === "ghost") {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        style={[
          styles.ghost,
          { paddingVertical: padV, borderRadius: radius, opacity: disabled ? 0.6 : 1 },
          style,
        ]}
      >
        <Text style={[styles.ghostText, { fontSize }]}>{label}</Text>
      </Pressable>
    );
  }

  if (variant === "danger") {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        style={[
          styles.danger,
          { paddingVertical: padV, borderRadius: radius, opacity: disabled ? 0.6 : 1 },
          style,
        ]}
      >
        <Text style={[styles.dangerText, { fontSize }]}>{label}</Text>
      </Pressable>
    );
  }

  if (variant === "green") {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        style={[
          styles.green,
          {
            paddingVertical: padV,
            borderRadius: radius,
            opacity: disabled || loading ? 0.65 : 1,
          },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={[styles.label, { fontSize }]}>{label}</Text>
        )}
      </Pressable>
    );
  }

  const r = size === "sm" ? 12 : 16;

  // Primary CTA — Home-style gold (matches Share Invite)
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[{ opacity: disabled || loading ? 0.65 : 1 }, style]}
    >
      <LinearGradient
        colors={[colors.primary, colors.primaryEnd]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[
          styles.grad,
          {
            paddingVertical: padV,
            borderRadius: r,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#111111" />
        ) : (
          <Text style={[styles.label, { fontSize }]}>{label}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grad: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FFD143",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  green: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.greenBtn,
    shadowColor: "#00C853",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  ghost: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
  },
  danger: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 59, 92, 0.35)",
    backgroundColor: "rgba(255, 59, 92, 0.08)",
  },
  label: {
    color: "#111111",
    fontWeight: "800",
  },
  ghostText: {
    color: colors.text,
    fontWeight: "600",
  },
  dangerText: {
    color: colors.loss,
    fontWeight: "700",
  },
});
