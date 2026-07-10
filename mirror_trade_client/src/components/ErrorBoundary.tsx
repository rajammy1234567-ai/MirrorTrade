import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

type Props = { children: React.ReactNode };
type State = { error: Error | null };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("App crash:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.box}>
          <Text style={styles.title}>Web render error</Text>
          <ScrollView style={styles.scroll}>
            <Text style={styles.msg}>{this.state.error.message}</Text>
            <Text style={styles.stack}>{this.state.error.stack}</Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    backgroundColor: "#1a0a0a",
    padding: 24,
    justifyContent: "center",
  },
  title: {
    color: "#ff6b6b",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  scroll: { maxHeight: 400 },
  msg: { color: "#ffffff", fontSize: 14, marginBottom: 12 },
  stack: { color: "#bbbbbb", fontSize: 11 },
});
