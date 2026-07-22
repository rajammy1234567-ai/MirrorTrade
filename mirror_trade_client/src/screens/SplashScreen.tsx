import React, { useEffect } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import AppLogo from "../components/AppLogo";
import { RootStackParamList } from "../navigation/types";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Splash">;

export default function SplashScreen({ navigation }: Props) {
  const { user, loading, onboarded } = useAuth();

  useEffect(() => {
    if (loading) return;

    // Short splash, then route
    const delay = Platform.OS === "web" ? 150 : 600;
    const t = setTimeout(() => {
      if (!user) {
        navigation.replace("Auth");
      } else if (!onboarded) {
        // Optional API connect once — user can skip via Home button
        navigation.replace("ExchangeConnect");
      } else {
        navigation.replace("MainTabs");
      }
    }, delay);
    return () => clearTimeout(t);
  }, [user, loading, onboarded, navigation]);

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom", "left", "right"]}>
      <View style={styles.center}>
        <AppLogo />
        <Text style={styles.tag}>Secure · Smart · Automated</Text>
        {loading ? <Text style={styles.loading}>Starting…</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  tag: {
    marginTop: 36,
    fontSize: 11,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    color: colors.muted,
    fontWeight: "600",
  },
  loading: {
    marginTop: 16,
    color: colors.muted,
    fontSize: 12,
  },
});
