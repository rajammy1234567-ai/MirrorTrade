import React from "react";
import { StyleSheet, Text, TextStyle } from "react-native";
import { colors } from "../theme/colors";

type Props = {
  value: number;
  suffix?: string;
  prefix?: string;
  size?: "sm" | "md" | "lg" | "xl";
  bold?: boolean;
  style?: TextStyle;
};

const sizeMap = {
  sm: 12,
  md: 14,
  lg: 16,
  xl: 24,
};

export function formatPnl(
  value: number,
  opts?: { prefix?: string; suffix?: string }
) {
  const sign = value >= 0 ? "+" : "-";
  const abs = Math.abs(value).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
  return `${sign}${opts?.prefix || ""}${abs}${opts?.suffix || ""}`;
}

export default function PnlText({
  value,
  suffix = "",
  prefix = "",
  size = "md",
  bold = true,
  style,
}: Props) {
  const positive = value >= 0;

  return (
    <Text
      style={[
        styles.base,
        {
          fontSize: sizeMap[size],
          fontWeight: bold ? "700" : "500",
          color: positive ? colors.profit : colors.loss,
        },
        style,
      ]}
    >
      {formatPnl(value, { prefix, suffix })}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontVariant: ["tabular-nums"],
  },
});
