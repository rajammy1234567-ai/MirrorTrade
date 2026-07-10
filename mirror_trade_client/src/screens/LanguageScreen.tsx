import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Screen from "../components/Screen";
import { useAppData } from "../context/AppDataContext";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Language">;

const languages = ["English", "हिन्दी", "Español", "Português", "中文"];
const regions = ["Global (USDT)", "India (INR)", "EU (EUR)", "UK (GBP)"];

export default function LanguageScreen({ navigation }: Props) {
  const { settings, updateSettings } = useAppData();

  return (
    <Screen>
      <View style={styles.nav}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={18} color={colors.text} />
        </Pressable>
        <Text style={styles.navTitle}>Language & Region</Text>
        <View style={{ width: 36 }} />
      </View>

      <Text style={styles.section}>LANGUAGE</Text>
      <View style={styles.card}>
        {languages.map((lang, i) => {
          const on = settings.language === lang;
          return (
            <Pressable
              key={lang}
              style={[styles.row, i > 0 && styles.border]}
              onPress={() => updateSettings({ language: lang })}
            >
              <Text style={[styles.rowText, on && styles.on]}>{lang}</Text>
              {on ? (
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.section}>REGION / DISPLAY CURRENCY</Text>
      <View style={styles.card}>
        {regions.map((r, i) => {
          const on = settings.region === r;
          return (
            <Pressable
              key={r}
              style={[styles.row, i > 0 && styles.border]}
              onPress={() => updateSettings({ region: r })}
            >
              <Text style={[styles.rowText, on && styles.on]}>{r}</Text>
              {on ? (
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              ) : null}
            </Pressable>
          );
        })}
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
  section: {
    marginTop: 8,
    marginBottom: 8,
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
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  border: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowText: { fontSize: 15, color: colors.text, fontWeight: "500" },
  on: { color: colors.primary, fontWeight: "700" },
});
