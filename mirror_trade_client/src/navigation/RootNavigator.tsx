import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createStackNavigator } from "@react-navigation/stack";
import { RootStackParamList } from "./types";
import { colors } from "../theme/colors";
import SplashScreen from "../screens/SplashScreen";
import AuthScreen from "../screens/AuthScreen";
import TwoFAScreen from "../screens/TwoFAScreen";
import ExchangeConnectScreen from "../screens/ExchangeConnectScreen";
import MainTabs from "./MainTabs";
import TraderDetailScreen from "../screens/TraderDetailScreen";
import CopySetupScreen from "../screens/CopySetupScreen";
import CreateBotScreen from "../screens/CreateBotScreen";
import SignalsScreen from "../screens/SignalsScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import BotDetailScreen from "../screens/BotDetailScreen";
import SecurityScreen from "../screens/SecurityScreen";
import LanguageScreen from "../screens/LanguageScreen";
import TradingPrefsScreen from "../screens/TradingPrefsScreen";
import HelpScreen from "../screens/HelpScreen";
import ReferralScreen from "../screens/ReferralScreen";
import TeamRankScreen from "../screens/TeamRankScreen";

const NativeStack = createNativeStackNavigator<RootStackParamList>();
const WebStack = createStackNavigator<RootStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

const screens: {
  name: keyof RootStackParamList;
  component: React.ComponentType<any>;
  modal?: boolean;
}[] = [
  { name: "Splash", component: SplashScreen },
  { name: "Auth", component: AuthScreen },
  { name: "TwoFA", component: TwoFAScreen },
  { name: "ExchangeConnect", component: ExchangeConnectScreen },
  { name: "MainTabs", component: MainTabs },
  { name: "TraderDetail", component: TraderDetailScreen },
  { name: "CopySetup", component: CopySetupScreen, modal: true },
  { name: "CreateBot", component: CreateBotScreen },
  { name: "Signals", component: SignalsScreen },
  { name: "Notifications", component: NotificationsScreen },
  { name: "BotDetail", component: BotDetailScreen },
  { name: "Security", component: SecurityScreen },
  { name: "Language", component: LanguageScreen },
  { name: "TradingPrefs", component: TradingPrefsScreen },
  { name: "Help", component: HelpScreen },
  { name: "Referral", component: ReferralScreen },
  { name: "TeamRank", component: TeamRankScreen },
];

function NativeAppStack() {
  return (
    <NativeStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: "slide_from_right",
      }}
    >
      {screens.map((s) => (
        <NativeStack.Screen
          key={s.name}
          name={s.name}
          component={s.component}
          options={s.modal ? { presentation: "modal" } : undefined}
        />
      ))}
    </NativeStack.Navigator>
  );
}

function WebAppStack() {
  return (
    <WebStack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.bg, flex: 1 },
      }}
    >
      {screens.map((s) => (
        <WebStack.Screen key={s.name} name={s.name} component={s.component} />
      ))}
    </WebStack.Navigator>
  );
}

export default function RootNavigator() {
  // Don't block entire app on auth bootstrap — Splash handles routing
  return (
    <View style={styles.fill}>
      <NavigationContainer theme={navTheme}>
        {Platform.OS === "web" ? <WebAppStack /> : <NativeAppStack />}
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
