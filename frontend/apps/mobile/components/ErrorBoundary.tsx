import { Component, type ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useThemeStore } from "../src/store/theme.store";
import { DARK_THEME, LIGHT_THEME } from "../src/theme/useTheme";

function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  const isDark = useThemeStore((s) => s.isDark);
  const tc = isDark ? DARK_THEME : LIGHT_THEME;
  return (
    <View style={[styles.container, { backgroundColor: tc.pageBg }]}>
      <Text style={[styles.title, { color: tc.textPrimary }]}>Something went wrong</Text>
      <Text style={[styles.message, { color: tc.textSecondary }]}>
        An unexpected problem occurred. Try again, and if it keeps happening please restart the app.
      </Text>
      <TouchableOpacity style={styles.button} onPress={onRetry} accessibilityRole="button" accessibilityLabel="Try again">
        <Text style={styles.buttonText}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Without this, an uncaught render error anywhere below (e.g. a navigation
// race that unmounts a screen mid-transition) tears down the whole React tree
// with nothing left to render — a blank/black screen in a release build,
// which reads to users as "the app closed." This boundary catches it and
// offers a way back in instead of a dead screen.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("Unhandled render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return <ErrorFallback onRetry={() => this.setState({ error: null })} />;
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B1220",
    padding: 24,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  message: {
    color: "#A9B2C3",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#1A6BAE",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
