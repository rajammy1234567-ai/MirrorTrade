import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Screen from "../components/Screen";
import GradientButton from "../components/GradientButton";
import { useAppData } from "../context/AppDataContext";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "CreateBot">;

export default function CreateBotScreen({ navigation, route }: Props) {
  const { createBot } = useAppData();
  const [type, setType] = useState<"Grid" | "DCA">(
    route.params?.type || "Grid"
  );
  const [market, setMarket] = useState<"Spot" | "Futures">("Spot");
  const [pair, setPair] = useState("BTC/USDT");
  const [amount, setAmount] = useState("1000");
  const [grids, setGrids] = useState("20");
  const [low, setLow] = useState("60000");
  const [high, setHigh] = useState("72000");

  const launch = () => {
    const inv = Number(amount) || 0;
    if (inv < 50) {
      Alert.alert("Invalid amount", "Minimum investment is ₹50 INR");
      return;
    }
    const bot = createBot({
      name: `${pair.split("/")[0]} ${type} Bot`,
      type,
      market,
      pair: pair.toUpperCase(),
      investment: inv,
    });
    Alert.alert("Bot launched", `${bot.name} is live with ₹${inv}.`, [
      {
        text: "View bot",
        onPress: () =>
          navigation.replace("BotDetail", { botId: bot.id }),
      },
      { text: "Done", onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <Screen
      footer={<GradientButton label="Launch Bot" onPress={launch} />}
    >
      <View style={styles.nav}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={18} color={colors.text} />
        </Pressable>
        <Text style={styles.navTitle}>Create Bot</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.typeRow}>
        {(["Grid", "DCA"] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setType(t)}
            style={[styles.typeBtn, type === t && styles.typeBtnActive]}
          >
            <Text style={[styles.typeText, type === t && styles.typeTextActive]}>
              {t} Bot
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.typeRow}>
        {(["Spot", "Futures"] as const).map((m) => (
          <Pressable
            key={m}
            onPress={() => setMarket(m)}
            style={[styles.typeBtn, market === m && styles.marketBtnActive]}
          >
            <Text
              style={[styles.typeText, market === m && styles.marketTextActive]}
            >
              {m}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.card}>
        <Field label="Pair" value={pair} onChange={setPair} />
        <Field
          label="Investment (INR)"
          value={amount}
          onChange={setAmount}
          keyboard
        />
        {type === "Grid" ? (
          <>
            <Field label="Lower price" value={low} onChange={setLow} keyboard />
            <Field label="Upper price" value={high} onChange={setHigh} keyboard />
            <Field
              label="Number of grids"
              value={grids}
              onChange={setGrids}
              keyboard
            />
          </>
        ) : (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
            <Text style={styles.infoText}>
              DCA will split ₹{amount || "0"} into recurring buys on {pair} ({market}).
            </Text>
          </View>
        )}
      </View>

      {type === "Grid" ? (
        <View style={styles.preview}>
          <Text style={styles.previewTitle}>Grid levels preview</Text>
          <View style={styles.gridPreview}>
            {[
              high,
              "…",
              Math.round((Number(high) + Number(low)) / 2 || 0).toString(),
              "…",
              low,
            ].map((lvl, i) => (
              <View key={i} style={styles.levelRow}>
                <View style={styles.levelLine} />
                <Text style={styles.levelText}>{lvl}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.previewHint}>
            {grids} levels between ₹{low} – ₹{high}
          </Text>
        </View>
      ) : null}
    </Screen>
  );
}

function Field({
  label,
  value,
  onChange,
  keyboard,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboard?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard ? "decimal-pad" : "default"}
        autoCapitalize="characters"
        placeholderTextColor={colors.muted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  typeRow: { marginTop: 20, flexDirection: "row", gap: 10 },
  typeBtn: {
    flex: 1,
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 14,
  },
  typeBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  marketBtnActive: {
    borderColor: "#F5E6A8",
    backgroundColor: "rgba(245, 230, 168, 0.16)",
  },
  typeText: { fontSize: 14, fontWeight: "600", color: colors.muted },
  typeTextActive: { color: colors.primary },
  marketTextActive: { color: "#F5E6A8" },
  card: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
  },
  field: { marginBottom: 12 },
  fieldLabel: {
    marginBottom: 6,
    fontSize: 12,
    color: colors.muted,
    fontWeight: "600",
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  infoBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    padding: 12,
  },
  infoText: { flex: 1, fontSize: 12, color: colors.muted, lineHeight: 17 },
  preview: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
  },
  previewTitle: {
    marginBottom: 12,
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  gridPreview: {
    height: 120,
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    padding: 12,
  },
  levelRow: { flexDirection: "row", alignItems: "center" },
  levelLine: {
    height: 1,
    flex: 1,
    backgroundColor: "rgba(91,108,255,0.35)",
  },
  levelText: {
    marginLeft: 8,
    width: 64,
    textAlign: "right",
    fontSize: 11,
    color: colors.muted,
  },
  previewHint: { marginTop: 10, fontSize: 12, color: colors.muted },
});
