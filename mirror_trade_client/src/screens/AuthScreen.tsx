import React, { useState } from "react";
import {
  Alert,
  Platform,
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

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const score =
    (password.length >= 6 ? 1 : 0) +
    (password.length >= 10 ? 1 : 0) +
    (/[A-Z]/.test(password) ? 1 : 0) +
    (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password) ? 1 : 0);
  const level = Math.min(score, 3);
  const labels = ["Weak", "Fair", "Strong"] as const;
  const barColors = ["#FF3B5C", "#F5A524", "#00D084"] as const;

  return (
    <View style={styles.strengthRow}>
      <View style={styles.strengthBars}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.strengthBar,
              {
                backgroundColor:
                  i < level ? barColors[level - 1] : "rgba(55, 63, 82, 0.6)",
              },
            ]}
          />
        ))}
      </View>
      <Text
        style={[
          styles.strengthLabel,
          { color: level ? barColors[level - 1] : colors.muted },
        ]}
      >
        {level ? labels[level - 1] : ""}
      </Text>
    </View>
  );
}

export default function AuthScreen({ navigation }: Props) {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<Tab>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("user@mirrortrade.com");
  const [phone, setPhone] = useState("");
  const [referralCode, setReferralCode] = useState("");
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
      setName("");
      setPhone("");
      setReferralCode("");
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
        await register(name.trim(), email.trim(), password, referralCode);
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
      {/* Decorative ambient blobs */}
      <View style={styles.blobTop} pointerEvents="none" />
      <View style={styles.blobBottom} pointerEvents="none" />

      {/* Skip Button */}
      <View style={styles.headerRow}>
        <Pressable
          style={styles.skipBtn}
          onPress={() => navigation.replace("MainTabs")}
        >
          <Text style={styles.skipText}>Skip</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.center}>
        {/* Brand header */}
        <View style={styles.logoBlock}>
          <View style={styles.logoGlow} pointerEvents="none" />
          <LinearGradient
            colors={["#5B6CFF", "#7C5CFF", "#A855F7"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoBox}
          >
            <Ionicons name="trending-up" size={28} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.brand}>MirrorTrade</Text>
          <Text style={styles.tagline}>
            {tab === "login"
              ? "Welcome back — pick up where you left off"
              : "Start copying pro traders in minutes"}
          </Text>
        </View>

        {/* Glass card */}
        <View style={styles.card}>
          {/* Pill tabs */}
          <View style={styles.tabShell}>
            {(["login", "signup"] as Tab[]).map((key) => {
              const active = tab === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => switchTab(key)}
                  style={styles.tabBtn}
                >
                  {active ? (
                    <LinearGradient
                      colors={["#4F6EF7", "#7C5CFF"]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={styles.tabBtnActive}
                    >
                      <Text style={styles.tabTextActive}>
                        {key === "login" ? "Log In" : "Sign Up"}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.tabBtnIdle}>
                      <Text style={styles.tabText}>
                        {key === "login" ? "Log In" : "Sign Up"}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          <View style={styles.form}>
            {tab === "signup" ? (
              <>
                <AuthInput
                  icon="person-outline"
                  label="Full name"
                  placeholder="Alex Morgan"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoComplete="name"
                />
                <AuthInput
                  icon="call-outline"
                  label="Phone"
                  placeholder="+1 555 000 0000 (optional)"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                />
                <AuthInput
                  icon="gift-outline"
                  label="Referral code"
                  placeholder="MT-XXXXXX (optional)"
                  value={referralCode}
                  onChangeText={setReferralCode}
                  autoCapitalize="characters"
                />
              </>
            ) : null}

            <AuthInput
              icon="mail-outline"
              label="Email"
              placeholder="you@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <AuthInput
              icon="lock-closed-outline"
              label="Password"
              placeholder={
                tab === "signup" ? "Min. 6 characters" : "Enter your password"
              }
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              showPasswordToggle
              passwordVisible={passwordVisible}
              onTogglePassword={() => setPasswordVisible((v) => !v)}
              autoComplete={tab === "login" ? "password" : "new-password"}
            />

            {tab === "signup" ? <PasswordStrength password={password} /> : null}

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
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Pressable>
            ) : (
              <Text style={styles.terms}>
                By creating an account you agree to our{" "}
                <Text style={styles.termsLink}>Terms</Text> &{" "}
                <Text style={styles.termsLink}>Privacy Policy</Text>
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
        </View>

        {/* Divider */}
        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>or continue with</Text>
          <View style={styles.orLine} />
        </View>

        {/* Social */}
        <View style={styles.socialRow}>
          <Pressable
            style={({ pressed }) => [
              styles.socialBtn,
              pressed && styles.socialBtnPressed,
            ]}
            onPress={() => Alert.alert("Google", "Social login coming soon")}
          >
            <View style={[styles.socialIcon, styles.googleIcon]}>
              <Ionicons name="logo-google" size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.socialText}>Google</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.socialBtn,
              pressed && styles.socialBtnPressed,
            ]}
            onPress={() => Alert.alert("Apple", "Social login coming soon")}
          >
            <View style={[styles.socialIcon, styles.appleIcon]}>
              <Ionicons name="logo-apple" size={17} color="#FFFFFF" />
            </View>
            <Text style={styles.socialText}>Apple</Text>
          </Pressable>
        </View>

        {/* Switch account type */}
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

        {/* Demo hint */}
        <View style={styles.demoChip}>
          <Ionicons name="flash-outline" size={12} color="#7C8CFF" />
          <Text style={styles.demo}>
            Demo · user@mirrortrade.com / User@123
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenPad: {
    paddingHorizontal: 20,
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: 10,
    zIndex: 10,
  },
  skipBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(91, 108, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(91, 108, 255, 0.2)",
  },
  skipText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  blobTop: {
    position: "absolute",
    top: -80,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(91, 108, 255, 0.12)",
  },
  blobBottom: {
    position: "absolute",
    bottom: 40,
    left: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(168, 85, 247, 0.08)",
  },
  center: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 24,
  },
  logoBlock: {
    alignItems: "center",
    marginBottom: 28,
  },
  logoGlow: {
    position: "absolute",
    top: -10,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(91, 108, 255, 0.22)",
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#5B6CFF",
    shadowOpacity: 0.6,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  brand: {
    marginTop: 16,
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.7,
  },
  tagline: {
    marginTop: 6,
    fontSize: 13.5,
    color: colors.muted,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 19,
    maxWidth: 280,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(55, 63, 82, 0.55)",
    backgroundColor:
      Platform.OS === "web"
        ? "rgba(18, 22, 34, 0.72)"
        : "rgba(18, 22, 34, 0.92)",
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  tabShell: {
    flexDirection: "row",
    borderRadius: 14,
    backgroundColor: "rgba(10, 13, 20, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(42, 49, 66, 0.8)",
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
  },
  tabBtnActive: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    paddingVertical: 11,
    shadowColor: "#5B6CFF",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  tabBtnIdle: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    paddingVertical: 11,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.muted,
  },
  tabTextActive: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  form: {
    marginTop: 18,
  },
  strengthRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: -4,
    marginBottom: 10,
    gap: 10,
  },
  strengthBars: {
    flex: 1,
    flexDirection: "row",
    gap: 5,
  },
  strengthBar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: "700",
    minWidth: 42,
    textAlign: "right",
  },
  forgot: {
    marginTop: -2,
    marginBottom: 16,
    alignSelf: "flex-end",
  },
  forgotText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
  terms: {
    marginBottom: 16,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
    textAlign: "center",
  },
  termsLink: {
    color: "#9AA8FF",
    fontWeight: "600",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 59, 92, 0.28)",
    backgroundColor: "rgba(255, 59, 92, 0.08)",
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  error: {
    flex: 1,
    color: colors.loss,
    fontSize: 13,
    fontWeight: "500",
  },
  cta: {
    marginTop: 2,
  },
  orRow: {
    marginTop: 24,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  orLine: {
    height: StyleSheet.hairlineWidth,
    flex: 1,
    backgroundColor: "rgba(55, 63, 82, 0.9)",
  },
  orText: {
    marginHorizontal: 14,
    fontSize: 12,
    color: "#6B7388",
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(55, 63, 82, 0.75)",
    backgroundColor: "rgba(18, 22, 34, 0.85)",
    paddingVertical: 13,
    gap: 10,
  },
  socialBtnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  socialIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  googleIcon: {
    backgroundColor: "rgba(234, 67, 53, 0.18)",
  },
  appleIcon: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  socialText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  switchHint: {
    marginTop: 22,
    textAlign: "center",
    fontSize: 13.5,
    color: colors.muted,
  },
  switchLink: {
    color: colors.primary,
    fontWeight: "700",
  },
  demoChip: {
    marginTop: 16,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(91, 108, 255, 0.2)",
    backgroundColor: "rgba(91, 108, 255, 0.08)",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  demo: {
    fontSize: 11,
    color: "#8B95B8",
    fontWeight: "500",
  },
});
