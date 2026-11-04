import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { Colors } from "../../theme/colors";
import { useTheme } from "../../theme/useTheme";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps {
  children: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Button({
  children,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
  textStyle,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const { tc } = useTheme();

  const variantStyles: Record<Variant, { container: ViewStyle; text: TextStyle }> = {
    primary: {
      container: {
        backgroundColor: isDisabled ? "#93C5FD" : Colors.brand.blue,
      },
      text: {
        color: "#FFFFFF",
      },
    },
    secondary: {
      container: {
        backgroundColor: tc.inputBg,
        borderWidth: 1.5,
        borderColor: tc.borderLight,
      },
      text: {
        color: tc.textPrimary,
      },
    },
    ghost: {
      container: {
        backgroundColor: "transparent",
      },
      text: {
        color: Colors.brand.blue,
      },
    },
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={children}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant].container,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" ? "#FFFFFF" : Colors.brand.blue}
        />
      ) : (
        <Text style={[styles.text, variantStyles[variant].text, textStyle]}>
          {children}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  text: {
    fontSize: 16,
    fontWeight: "700",
  },
});
