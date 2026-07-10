import React, { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Screen from "../components/Screen";
import GradientButton from "../components/GradientButton";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Help">;

const faqs = [
  {
    q: "How does copy trading work?",
    a: "You allocate USDT to a trader. When they open or close positions, MirrorTrade mirrors the trade size (with your multiplier) on your connected exchange.",
  },
  {
    q: "Is withdrawal access required?",
    a: "Never. We only need read + trade API permissions. Withdrawals stay disabled so funds remain on your exchange.",
  },
  {
    q: "What is max drawdown stop?",
    a: "If copy equity drops by your set percentage, open positions are closed and new copies pause until you resume.",
  },
  {
    q: "Grid vs DCA bots?",
    a: "Grid places buys/sells across a range. DCA invests fixed amounts on a schedule regardless of short-term price noise.",
  },
];

export default function HelpScreen({ navigation }: Props) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <Screen>
      <View style={styles.nav}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={18} color={colors.text} />
        </Pressable>
        <Text style={styles.navTitle}>Help & Support</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.banner}>
        <Ionicons name="chatbubbles-outline" size={22} color={colors.primary} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.bannerTitle}>Need a human?</Text>
          <Text style={styles.bannerSub}>
            Average reply under 2 hours · 24/7 for critical issues
          </Text>
        </View>
      </View>

      <Text style={styles.section}>FAQ</Text>
      <View style={styles.card}>
        {faqs.map((f, i) => {
          const isOpen = open === i;
          return (
            <View key={f.q} style={i > 0 ? styles.faqBorder : undefined}>
              <Pressable
                style={styles.faqHead}
                onPress={() => setOpen(isOpen ? null : i)}
              >
                <Text style={styles.faqQ}>{f.q}</Text>
                <Ionicons
                  name={isOpen ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={colors.muted}
                />
              </Pressable>
              {isOpen ? <Text style={styles.faqA}>{f.a}</Text> : null}
            </View>
          );
        })}
      </View>

      <View style={{ marginTop: 16, gap: 10 }}>
        <GradientButton
          label="Email support"
          onPress={() => Linking.openURL("mailto:help@mirrortrade.app")}
        />
        <GradientButton
          label="Open status page"
          variant="ghost"
          onPress={() => Linking.openURL("https://status.mirrortrade.app")}
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
  banner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
    marginBottom: 16,
  },
  bannerTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  bannerSub: { marginTop: 3, fontSize: 12, color: colors.muted },
  section: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: colors.muted,
    marginBottom: 8,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
  },
  faqBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  faqHead: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 10,
  },
  faqQ: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.text },
  faqA: {
    paddingBottom: 14,
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
  },
});
