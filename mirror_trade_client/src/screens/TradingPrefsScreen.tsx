import React from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Screen from "../components/Screen";
import RangeSlider from "../components/RangeSlider";
import { useAppData } from "../context/AppDataContext";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "TradingPrefs">;

export default function TradingPrefsScreen({ navigation }: Props) {
  const { settings, updateSettings } = useAppData();

  return (
    <Screen>
      <View style={styles.nav}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={18} color={colors.text} />
        </Pressable>
        <Text style={styles.navTitle}>Trading Preferences</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Default leverage</Text>
        <Text style={styles.lev}>{settings.defaultLeverage}x</Text>
        <RangeSlider
          value={settings.defaultLeverage}
          min={1}
          max={20}
          onChange={(v) => updateSettings({ defaultLeverage: v })}
          trackColor={colors.primary}
          thumbColor={colors.primary}
        />
        <View style={styles.sliderLabels}>
          <Text style={styles.hint}>1x</Text>
          <Text style={styles.hint}>10x</Text>
          <Text style={styles.hint}>20x</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Toggle
          title="Confirm orders"
          sub="Ask before opening or closing positions"
          value={settings.confirmOrders}
          onChange={(v) => updateSettings({ confirmOrders: v })}
        />
        <View style={styles.divider} />
        <Toggle
          title="Trade notifications"
          sub="Fills, liquidations risk, copy opens"
          value={settings.tradeNotifications}
          onChange={(v) => updateSettings({ tradeNotifications: v })}
        />
        <View style={styles.divider} />
        <Toggle
          title="Signal alerts"
          sub="Push when new signals match your pairs"
          value={settings.signalAlerts}
          onChange={(v) => updateSettings({ signalAlerts: v })}
        />
      </View>
    </Screen>
  );
}

function Toggle({
  title,
  sub,
  value,
  onChange,
}: {
  title: string;
  sub: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleSub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.primary, false: colors.border }}
        thumbColor="#fff"
      />
    </View>
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
  label: { fontSize: 12, color: colors.muted, fontWeight: "600" },
  lev: {
    marginTop: 6,
    marginBottom: 12,
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
  },
  sliderLabels: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  hint: { fontSize: 11, color: colors.muted },
  toggleRow: { flexDirection: "row", alignItems: "center" },
  toggleTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  toggleSub: { marginTop: 3, fontSize: 12, color: colors.muted, lineHeight: 17 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
});
