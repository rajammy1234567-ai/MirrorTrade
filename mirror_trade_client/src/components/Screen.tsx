import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { colors } from "../theme/colors";

type Edge = "top" | "bottom" | "left" | "right";

type Props = {
  children: React.ReactNode;
  /** Scrollable body (default true) */
  scroll?: boolean;
  /** Horizontal padding + max width (default true) */
  padded?: boolean;
  /**
   * Safe-area edges.
   * - Tab screens: ["top"]  (tab bar owns bottom)
   * - Stack screens: ["top","bottom"]
   */
  edges?: Edge[];
  /**
   * Extra bottom breathing room for tab screens so last card
   * doesn't sit tight against the tab bar.
   */
  tabScreen?: boolean;
  /** Sticky footer pinned above home-indicator / safe bottom */
  footer?: React.ReactNode;
  /** Keyboard avoiding (auth-style forms) */
  keyboard?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  bg?: string;
};

export default function Screen({
  children,
  scroll = true,
  padded = true,
  edges,
  tabScreen = false,
  footer,
  keyboard = false,
  style,
  contentStyle,
  bg = colors.bg,
}: Props) {
  const insets = useSafeAreaInsets();

  // Tabs: only top. Stack / full screens: top+bottom (footer handles its own bottom)
  const safeEdges: Edge[] =
    edges ?? (tabScreen || footer ? ["top", "left", "right"] : ["top", "bottom", "left", "right"]);

  const bottomPad = tabScreen
    ? 20
    : footer
      ? 16 + 72 // room so content clears sticky CTA
      : 16;

  const body = (
    <View
      style={[
        padded && styles.padded,
        { paddingBottom: bottomPad },
        contentStyle,
        style,
      ]}
    >
      {children}
    </View>
  );

  const main = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      bounces
    >
      {body}
    </ScrollView>
  ) : (
    <View style={styles.flex}>{body}</View>
  );

  const wrapped = keyboard ? (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
    >
      {main}
    </KeyboardAvoidingView>
  ) : (
    main
  );

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <SafeAreaView style={styles.flex} edges={safeEdges}>
        {wrapped}
      </SafeAreaView>

      {footer ? (
        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, 12),
              backgroundColor: bg,
            },
          ]}
        >
          <View style={styles.footerInner}>{footer}</View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  padded: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 16,
  },
  scrollContent: {
    flexGrow: 1,
    width: "100%",
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  footerInner: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
  },
});
