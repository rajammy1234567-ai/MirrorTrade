import React, { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  showPasswordToggle?: boolean;
  passwordVisible?: boolean;
  onTogglePassword?: () => void;
  keyboardType?: TextInputProps["keyboardType"];
  autoCapitalize?: TextInputProps["autoCapitalize"];
};

export default function AuthInput({
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  showPasswordToggle,
  passwordVisible,
  onTogglePassword,
  keyboardType = "default",
  autoCapitalize = "none",
}: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrap, focused && styles.wrapFocused]}>
      <Ionicons
        name={icon}
        size={18}
        color={focused ? colors.primary : colors.muted}
      />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#5C6478"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!!secureTextEntry && !passwordVisible}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        selectionColor={colors.primary}
      />
      {showPasswordToggle ? (
        <Pressable onPress={onTogglePassword} hitSlop={12} style={styles.eye}>
          <Ionicons
            name={passwordVisible ? "eye-outline" : "eye-off-outline"}
            size={18}
            color={colors.muted}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(42, 49, 66, 0.9)",
    backgroundColor: "#121722",
    paddingHorizontal: 16,
    minHeight: 54,
  },
  wrapFocused: {
    borderColor: "rgba(91, 108, 255, 0.55)",
    backgroundColor: "#151B28",
    shadowColor: colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  input: {
    marginLeft: 12,
    flex: 1,
    paddingVertical: Platform.OS === "web" ? 14 : 15,
    fontSize: 15,
    color: colors.text,
    fontWeight: "500",
  },
  eye: {
    paddingLeft: 8,
    paddingVertical: 4,
  },
});
