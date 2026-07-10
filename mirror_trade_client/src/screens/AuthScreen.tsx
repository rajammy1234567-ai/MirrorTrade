import React, { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import Screen from "../components/Screen";
import AuthInput from "../components/AuthInput";
import GradientButton from "../components/GradientButton";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Auth">;
type Tab = "login" | "signup";

export default function AuthScreen({ navigation }: Props) {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<Tab>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("user@mirrortrade.com");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("User@123");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const switchTab = (next: Tab) => {
    setTab(next);
    setError("");
    if (next === "signup") {
      setEmail("");
      setPassword("");
    } else {
      setEmail("user@mirrortrade.com");
      setPassword("User@123");
    }
  };

  const handleSubmit = async () => {
    setError("");
    if (tab === "login") {
      if (!email.trim() || !password) {
        setError("Please enter email and password");
        return;
      }
    } else {
      if (!name.trim() || !email.trim() || password.length < 6) {
        setError("Name, email and password (min 6) required");
        return;
      }
    }

    setSubmitting(true);
    try {
      if (tab === "login") {
        await login(email.trim(), password);
      } else {
        await register(name.trim(), email.trim(), password);
      }
      navigation.replace("TwoFA");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen
      keyboard
      edges={["top", "bottom", "left", "right"]}
      contentStyle={styles.screenPad}
    >
      <View style={styles.center}>
        {/* Ambient glow behind logo */}
        <View style={styles.glow} pointerEvents="none" />

        <View style={styles.logoBlock}>
          <LinearGradient
            colors={["#5B6CFF", "#7C5CFF", "#9B5CFF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoBox}
          >
            <Ionicons name="trending-up" size={30} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.brand}>MirrorTrade</Text>
          <Text style={styles.tagline}>Professional Copy Trading Platform</Text>
        </View>

        {/* Segmented control */}
        <View style={styles.tabShell}>
          {(["login", "signup"] as Tab[]).map((key) => {
            const active = tab === key;
            return (
              <Pressable
                key={key}
                onPress={() => switchTab(key)}
                style={[styles.tabBtn, active && styles.tabBtnActive]}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {key === "login" ? "Log In" : "Sign Up"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.form}>
          {tab === "signup" ? (
            <>
              <AuthInput
                icon="person-outline"
                placeholder="Full name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
              <AuthInput
                icon="call-outline"
                placeholder="Phone (optional)"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </>
          ) : null}

          <AuthInput
            icon="mail-outline"
            placeholder="Email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <AuthInput
            icon="lock-closed-outline"
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            showPasswordToggle
            passwordVisible={passwordVisible}
            onTogglePassword={() => setPasswordVisible((v) => !v)}
          />

          {tab === "login" ? (
            <Pressable
              style={styles.forgot}
              onPress={() =>
                Alert.alert(
                  "Forgot password",
                  "Password reset link will be sent to your email (demo)."
                )
              }
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </Pressable>
          ) : (
            <Text style={styles.terms}>
              By signing up you agree to our Terms & Privacy Policy
            </Text>
          )}

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={colors.loss} />
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.cta}>
            <GradientButton
              label={tab === "login" ? "Log In" : "Create Account"}
              onPress={handleSubmit}
              loading={submitting}
            />
          </View>
        </View>

        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>or continue with</Text>
          <View style={styles.orLine} />
        </View>

        <View style={styles.socialRow}>
          <Pressable
            style={styles.socialBtn}
            onPress={() => Alert.alert("Google", "Social login coming soon")}
          >
            <Ionicons name="logo-google" size={18} color="#FFFFFF" />
            <Text style={styles.socialText}>Google</Text>
          </Pressable>
          <Pressable
            style={styles.socialBtn}
            onPress={() => Alert.alert("Apple", "Social login coming soon")}
          >
            <Ionicons name="logo-apple" size={19} color="#FFFFFF" />
            <Text style={styles.socialText}>Apple</Text>
          </Pressable>
        </View>

        {tab === "login" ? (
          <Text style={styles.switchHint}>
            New here?{" "}
            <Text style={styles.switchLink} onPress={() => switchTab("signup")}>
              Create an account
            </Text>
          </Text>
        ) : (
          <Text style={styles.switchHint}>
            Already have an account?{" "}
            <Text style={styles.switchLink} onPress={() => switchTab("login")}>
              Log in
            </Text>
          </Text>
        )}

        <Text style={styles.demo}>
          Demo · user@mirrortrade.com / User@123
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenPad: {
    paddingHorizontal: 22,
  },
  center: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 20,
  },
  glow: {
    position: "absolute",
    top: "8%",
    alignSelf: "center",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(91, 108, 255, 0.16)",
  },
  logoBlock: {
    alignItems: "center",
    marginBottom: 8,
  },
  logoBox: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#5B6CFF",
    shadowOpacity: 0.55,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  brand: {
    marginTop: 18,
    fontSize: 30,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.6,
  },
  tagline: {
    marginTop: 6,
    fontSize: 13,
    color: colors.muted,
    fontWeight: "500",
  },
  tabShell: {
    marginTop: 28,
    flexDirection: "row",
    borderRadius: 16,
    backgroundColor: "#0F131C",
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    borderRadius: 12,
    paddingVertical: 12,
  },
  tabBtnActive: {
    backgroundColor: "#1A2130",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.muted,
  },
  tabTextActive: {
    color: colors.text,
    fontWeight: "700",
  },
  form: {
    marginTop: 20,
  },
  forgot: {
    marginTop: 2,
    marginBottom: 14,
    alignSelf: "flex-end",
  },
  forgotText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
  terms: {
    marginBottom: 14,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 17,
    textAlign: "center",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 59, 92, 0.3)",
    backgroundColor: "rgba(255, 59, 92, 0.08)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  error: {
    flex: 1,
    color: colors.loss,
    fontSize: 13,
    fontWeight: "500",
  },
  cta: {
    marginTop: 4,
  },
  orRow: {
    marginTop: 26,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  orLine: {
    height: StyleSheet.hairlineWidth,
    flex: 1,
    backgroundColor: colors.border,
  },
  orText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: colors.muted,
    fontWeight: "500",
  },
  socialRow: {
    flexDirection: "row",
    gap: 12,
  },
  socialBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#121722",
    paddingVertical: 14,
    gap: 8,
  },
  socialText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  switchHint: {
    marginTop: 22,
    textAlign: "center",
    fontSize: 13,
    color: colors.muted,
  },
  switchLink: {
    color: colors.primary,
    fontWeight: "700",
  },
  demo: {
    marginTop: 14,
    textAlign: "center",
    fontSize: 11,
    color: "#5C6478",
  },
});
