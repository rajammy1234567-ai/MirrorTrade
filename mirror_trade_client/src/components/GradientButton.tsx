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

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[{ opacity: disabled || loading ? 0.65 : 1 }, style]}
    >
      <LinearGradient
        colors={["#4F6EF7", "#6B5CFF", "#8B5CF6"]}
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
          <ActivityIndicator color="#FFFFFF" />
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
    shadowColor: "#5B6CFF",
    shadowOpacity: 0.55,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
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
    color: "#FFFFFF",
    fontWeight: "700",
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
