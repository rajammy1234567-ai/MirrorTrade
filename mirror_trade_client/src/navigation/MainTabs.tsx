import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import HomeScreen from "../screens/HomeScreen";
import DiscoverScreen from "../screens/DiscoverScreen";
import BotsScreen from "../screens/BotsScreen";
import PortfolioScreen from "../screens/PortfolioScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { MainTabParamList } from "./types";
import { colors } from "../theme/colors";

const Tab = createBottomTabNavigator<MainTabParamList>();

const icons: Record<
  keyof MainTabParamList,
  {
    active: keyof typeof Ionicons.glyphMap;
    inactive: keyof typeof Ionicons.glyphMap;
  }
> = {
  Home: { active: "home", inactive: "home-outline" },
  Discover: { active: "search", inactive: "search-outline" },
  Trade: { active: "hardware-chip", inactive: "hardware-chip-outline" },
  Portfolio: { active: "briefcase", inactive: "briefcase-outline" },
  Profile: { active: "card", inactive: "card-outline" },
};

const labels: Record<keyof MainTabParamList, string> = {
  Home: "Home",
  Discover: "Discover",
  Trade: "Bots",
  Portfolio: "Portfolio",
  Profile: "Assets",
};

const TAB_BASE = 56;

export default function MainTabs() {
  const insets = useSafeAreaInsets();
  // Web / desktop: small fixed pad. Phone: real home-indicator inset.
  const bottom = Platform.OS === "web" ? 8 : Math.max(insets.bottom, 8);
  const tabHeight = TAB_BASE + bottom;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: tabHeight,
          paddingBottom: bottom,
          paddingTop: 6,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarItemStyle: {
          paddingTop: 2,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarIcon: ({ color, focused }) => {
          const set = icons[route.name];
          return (
            <View style={styles.iconWrap}>
              {focused ? <View style={styles.activeDot} /> : null}
              <Ionicons
                name={focused ? set.active : set.inactive}
                size={22}
                color={color}
              />
            </View>
          );
        },
        tabBarLabel: ({ color }) => (
          <Text style={[styles.label, { color }]} numberOfLines={1}>
            {labels[route.name]}
          </Text>
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Discover" component={DiscoverScreen} />
      <Tab.Screen name="Trade" component={BotsScreen} />
      <Tab.Screen name="Portfolio" component={PortfolioScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 26,
  },
  activeDot: {
    position: "absolute",
    top: -4,
    width: 14,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 1,
  },
});
