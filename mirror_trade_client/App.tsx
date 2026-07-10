import "./global.css";
import React from "react";
import { StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/context/AuthContext";
import { AppDataProvider } from "./src/context/AppDataContext";
import ErrorBoundary from "./src/components/ErrorBoundary";
import RootNavigator from "./src/navigation/RootNavigator";
import { colors } from "./src/theme/colors";

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <View style={styles.root}>
            <StatusBar style="light" />
            <AuthProvider>
              <AppDataProvider>
                <RootNavigator />
              </AppDataProvider>
            </AuthProvider>
          </View>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
