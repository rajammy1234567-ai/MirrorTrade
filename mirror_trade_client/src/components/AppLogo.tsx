import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

type Props = {
  size?: "sm" | "md" | "lg";
  showTitle?: boolean;
  subtitle?: string;
};

export default function AppLogo({
  size = "lg",
  showTitle = true,
  subtitle = "Professional Copy Trading Platform",
}: Props) {
  const box = size === "lg" ? 68 : size === "md" ? 48 : 36;
  const icon = size === "lg" ? 32 : size === "md" ? 22 : 16;
  const radius = size === "lg" ? 18 : size === "md" ? 14 : 10;

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={["#5B6CFF", "#7C5CFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.iconBox,
          {
            width: box,
            height: box,
            borderRadius: radius,
          },
        ]}
      >
        <Ionicons name="trending-up" size={icon} color="#FFFFFF" />
      </LinearGradient>

      {showTitle ? (
        <View style={styles.titleBlock}>
          <Text style={styles.title}>MirrorTrade</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
  iconBox: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#5B6CFF",
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  titleBlock: { marginTop: 18, alignItems: "center" },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
  },
});
