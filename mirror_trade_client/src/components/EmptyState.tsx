import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
};

export default function EmptyState({
  icon = "folder-open-outline",
  title,
  subtitle,
}: Props) {
  return (
    <View className="items-center rounded-2xl border border-dashed border-mt-border bg-mt-surface px-6 py-10">
      <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-mt-elevated">
        <Ionicons name={icon} size={22} color="#8B93A7" />
      </View>
      <Text className="text-center text-base font-semibold text-mt-text">
        {title}
      </Text>
      <Text className="mt-2 text-center text-sm leading-5 text-mt-muted">
        {subtitle}
      </Text>
    </View>
  );
}
