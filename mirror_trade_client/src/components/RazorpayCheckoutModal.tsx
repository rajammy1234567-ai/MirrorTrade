import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import {
  buildRazorpayCheckoutHtml,
  type RazorpayCheckoutResult,
  type RazorpayOrderPayload,
} from "../services/razorpayCheckout";
import { colors } from "../theme/colors";

type Props = {
  visible: boolean;
  order: RazorpayOrderPayload | null;
  onResult: (result: RazorpayCheckoutResult) => void;
  onClose: () => void;
};

/**
 * Native (iOS/Android): Razorpay Standard Checkout inside a secure WebView.
 * Web uses openRazorpayWeb() directly — this modal is only for native.
 */
export default function RazorpayCheckoutModal({
  visible,
  order,
  onResult,
  onClose,
}: Props) {
  const html = useMemo(
    () => (order ? buildRazorpayCheckoutHtml(order) : ""),
    [order]
  );

  if (Platform.OS === "web") {
    return null;
  }

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as RazorpayCheckoutResult;
      onResult(data);
    } catch {
      onResult({ status: "failed", reason: "Invalid checkout response" });
    }
  };

  return (
    <Modal
      visible={visible && !!order}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title}>Secure payment</Text>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
        </View>
        <Text style={styles.sub}>
          Powered by Razorpay · UPI, cards, netbanking & wallets
        </Text>
        {order && html ? (
          <WebView
            originWhitelist={["*"]}
            source={{ html, baseUrl: "https://api.razorpay.com" }}
            onMessage={onMessage}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loading}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading Razorpay…</Text>
              </View>
            )}
            style={styles.webview}
          />
        ) : (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: Platform.OS === "ios" ? 12 : 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  sub: {
    color: colors.muted,
    fontSize: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: colors.muted,
    fontSize: 13,
  },
});
