import React, { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label?: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  showPasswordToggle?: boolean;
  passwordVisible?: boolean;
  onTogglePassword?: () => void;
  keyboardType?: TextInputProps["keyboardType"];
  autoCapitalize?: TextInputProps["autoCapitalize"];
  autoComplete?: TextInputProps["autoComplete"];
};

export default function AuthInput({
  icon,
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  showPasswordToggle,
  passwordVisible,
  onTogglePassword,
  keyboardType = "default",
  autoCapitalize = "none",
  autoComplete,
}: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.wrap, focused && styles.wrapFocused]}>
        <View style={[styles.iconWrap, focused && styles.iconWrapFocused]}>
          <Ionicons
            name={icon}
            size={17}
            color={focused ? colors.primary : "#6B7388"}
          />
        </View>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#4A5163"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!!secureTextEntry && !passwordVisible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          selectionColor={colors.primary}
        />
        {showPasswordToggle ? (
          <Pressable
            onPress={onTogglePassword}
            hitSlop={12}
            style={styles.eye}
          >
            <Ionicons
              name={passwordVisible ? "eye-outline" : "eye-off-outline"}
              size={18}
              color={focused ? colors.primary : "#6B7388"}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: 14,
  },
  label: {
    marginBottom: 8,
    marginLeft: 2,
    fontSize: 12,
    fontWeight: "600",
    color: "#9AA3B8",
    letterSpacing: 0.2,
  },
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(55, 63, 82, 0.7)",
    backgroundColor: "rgba(12, 16, 26, 0.85)",
    paddingHorizontal: 12,
    minHeight: 54,
  },
  wrapFocused: {
    borderColor: "rgba(91, 108, 255, 0.65)",
    backgroundColor: "rgba(18, 24, 40, 0.95)",
    shadowColor: colors.primary,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(28, 34, 48, 0.9)",
  },
  iconWrapFocused: {
    backgroundColor: "rgba(91, 108, 255, 0.14)",
  },
  input: {
    marginLeft: 10,
    flex: 1,
    paddingVertical: Platform.OS === "web" ? 13 : 14,
    fontSize: 15,
    color: colors.text,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  eye: {
    paddingLeft: 6,
    paddingVertical: 6,
    paddingRight: 2,
  },
});
