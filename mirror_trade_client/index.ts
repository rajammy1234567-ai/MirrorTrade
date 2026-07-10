import "@expo/metro-runtime";
import "react-native-gesture-handler";
import { Platform } from "react-native";
import { enableScreens } from "react-native-screens";
import { registerRootComponent } from "expo";

// native-stack uses react-native-screens; on web prefer plain views
if (Platform.OS === "web") {
  enableScreens(false);
}

// NativeWind: class-based dark mode (avoids media-query issues on web)
if (typeof document !== "undefined") {
  document.documentElement.classList.add("dark");
}

import App from "./App";

registerRootComponent(App);
