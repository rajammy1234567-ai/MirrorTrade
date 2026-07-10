import React, { useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Screen from "../components/Screen";
import GradientButton from "../components/GradientButton";
import { useAppData } from "../context/AppDataContext";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "TwoFA">;

export default function TwoFAScreen({ navigation }: Props) {
  const { settings } = useAppData();
  const [codes, setCodes] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const inputs = useRef<(TextInput | null)[]>([]);

  const setDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...codes];
    next[index] = digit;
    setCodes(next);
    setError("");
    if (digit && index < 5) inputs.current[index + 1]?.focus();
  };

  const onKeyPress = (index: number, key: string) => {
    if (key === "Backspace" && !codes[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const code = codes.join("");

  const verify = () => {
    if (code.length < 6) {
      setError("Enter the 6-digit code");
      return;
    }
    // Demo accepts any 6 digits, or classic 123456
    navigation.replace("ExchangeConnect");
  };

  // If user disabled 2FA in settings, skip (when coming back from re-login with settings)
  // Still show UI for onboarding flow — settings apply after first setup

  return (
    <Screen keyboard edges={["top", "bottom", "left", "right"]}>
      <View style={styles.wrap}>
        <View style={styles.iconWrap}>
          <View style={styles.iconBox}>
            <Ionicons name="shield-checkmark" size={28} color={colors.primary} />
          </View>
        </View>

        <Text style={styles.title}>Two-factor verification</Text>
        <Text style={styles.sub}>
          Enter the 6-digit code from your authenticator app.
          {settings.twoFAEnabled
            ? " Demo: use any 6 digits (e.g. 123456)."
            : " 2FA is optional on this account."}
        </Text>

        <View style={styles.row}>
          {codes.map((c, i) => (
            <TextInput
              key={i}
              ref={(ref) => {
                inputs.current[i] = ref;
              }}
              value={c}
              onChangeText={(v) => setDigit(i, v)}
              onKeyPress={({ nativeEvent }) => onKeyPress(i, nativeEvent.key)}
              keyboardType="number-pad"
              maxLength={1}
              style={[styles.box, c ? styles.boxFilled : null]}
              selectionColor={colors.primary}
            />
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.cta}>
          <GradientButton
            label="Verify & Continue"
            onPress={verify}
            disabled={code.length < 6}
          />
        </View>

        <Pressable style={styles.resend}>
          <Text style={styles.resendText}>Resend code</Text>
        </Pressable>

        <Pressable
          style={styles.skip}
          onPress={() => navigation.replace("ExchangeConnect")}
        >
          <Text style={styles.skipText}>Skip for now</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 24,
  },
  iconWrap: { alignItems: "center", marginBottom: 20 },
  iconBox: {
    height: 64,
    width: 64,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(91,108,255,0.25)",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  sub: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  row: {
    marginTop: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  box: {
    flex: 1,
    height: 56,
    maxWidth: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#121722",
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
  },
  boxFilled: {
    borderColor: "rgba(91,108,255,0.5)",
    backgroundColor: "#151B28",
  },
  error: {
    marginTop: 14,
    textAlign: "center",
    color: colors.loss,
    fontSize: 13,
  },
  cta: { marginTop: 28 },
  resend: { marginTop: 18, alignItems: "center" },
  resendText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  skip: { marginTop: 14, alignItems: "center" },
  skipText: { fontSize: 13, color: colors.muted },
});
