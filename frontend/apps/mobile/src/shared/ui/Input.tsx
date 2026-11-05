import { forwardRef, useState } from "react";
import {
  TextInput,
  View,
  Text,
  Pressable,
  type TextInputProps,
  StyleSheet,
} from "react-native";
import { Colors } from "../../theme/colors";
import { useTheme } from "../../theme/useTheme";
import { TYPE } from "../../theme/d";

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, icon, rightIcon, onFocus, onBlur, style, ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    const { tc, isDark } = useTheme();

    return (
      <View style={styles.container}>
        <Text style={[styles.label, { color: tc.textSecondary }]}>{label}</Text>
        <View
          style={[
            styles.inputWrapper,
            { backgroundColor: tc.inputBg, borderColor: "transparent" },
            focused && { borderColor: tc.accent, backgroundColor: tc.inputBg },
            error ? { borderColor: tc.dangerText } : null,
          ]}
        >
          {icon && <View style={styles.iconLeft}>{icon}</View>}
          <TextInput
            ref={ref}
            style={[styles.input, { color: tc.textPrimary }, icon ? { paddingLeft: 0 } : null, style]}
            placeholderTextColor={tc.textTertiary}
            accessibilityLabel={props.accessibilityLabel ?? label}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            {...props}
          />
          {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
        </View>
        {error ? <Text style={[styles.error, { color: tc.dangerText }]} accessibilityLiveRegion="polite">{error}</Text> : null}
      </View>
    );
  }
);

Input.displayName = "Input";
export default Input;

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    ...TYPE.label,
    marginLeft: 2,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bg.secondary,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  inputFocused: {
    borderColor: Colors.brand.blue,
    backgroundColor: Colors.brand.blueLight,
  },
  inputError: {
    borderColor: Colors.text.error,
    backgroundColor: "#FEF2F2",
  },
  iconLeft: {
    marginRight: 10,
  },
  iconRight: {
    marginLeft: 10,
  },
  input: {
    flex: 1,
    ...TYPE.body,
    fontSize: 15.5,
    color: Colors.text.primary,
    paddingVertical: 0,
  },
  error: {
    ...TYPE.small,
    fontSize: 12,
    color: Colors.text.error,
    marginLeft: 2,
  },
});
