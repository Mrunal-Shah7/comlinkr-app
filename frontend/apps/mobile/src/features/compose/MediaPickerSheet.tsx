// Split out of app/create-post.tsx (TR-013, point 9b).
import { palette } from "../../theme/palette";
import { useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Modal } from "react-native";
import Reanimated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { SPRING } from "../../shared/motion/presets";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/useTheme";
import { createThemedStyles } from "../../theme/themedStyles";
import { TYPE } from "../../theme/d";

// ── Section header helper ──────────────────────────────────────────────────────
export function SectionLabel({ label }: { label: string; color?: string }) {
  const { tc } = useTheme();
  return <Text style={[TYPE.overline, { color: tc.textTertiary, marginTop: 20, marginBottom: 8, marginLeft: 2 }]}>{label}</Text>;
}

// ── Native-style media picker sheet (Android — iOS uses ActionSheetIOS) ──────
export function MediaPickerSheet({
  visible,
  onClose,
  onLibrary,
  onCamera,
  title,
}: {
  visible: boolean;
  onClose: () => void;
  onLibrary: () => void;
  onCamera: () => void;
  title?: string;
}) {
  const { tc } = useTheme();
  const translateY = useSharedValue(300);

  // Slide in when shown. Started from an effect: starting it during render restarted the spring on every render.
  useEffect(() => {
    if (visible) translateY.set(withSpring(0, SPRING.sheet));
    else translateY.set(300);
  }, [visible, translateY]);
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.get() }] }));

  const dismiss = () => {
    translateY.set(withTiming(300, { duration: 200 }, (done) => { if (done) scheduleOnRN(onClose); }));
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismiss} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} onPress={dismiss} />
      <Reanimated.View style={[mps.sheet, { backgroundColor: tc.cardBg }, sheetStyle]}>
        <View style={mps.handle} />
        {title ? <Text style={[mps.title, { color: tc.textSecondary }]}>{title}</Text> : null}
        <Pressable
          style={[mps.row, { borderBottomColor: tc.borderLight }]}
          onPress={() => { dismiss(); setTimeout(onLibrary, 220); }}
        >
          <View style={mps.iconBox}>
            <Ionicons name="images-outline" size={22} color={palette.brandBlue} />
          </View>
          <Text style={[mps.rowText, { color: tc.textPrimary }]}>Photo Library</Text>
          <Ionicons name="chevron-forward" size={16} color={tc.textTertiary} />
        </Pressable>
        <Pressable
          style={[mps.row, { borderBottomColor: tc.borderLight }]}
          onPress={() => { dismiss(); setTimeout(onCamera, 220); }}
        >
          <View style={[mps.iconBox, { backgroundColor: palette.brandTealLight }]}>
            <Ionicons name="camera-outline" size={22} color={palette.brandTeal} />
          </View>
          <Text style={[mps.rowText, { color: tc.textPrimary }]}>Camera</Text>
          <Ionicons name="chevron-forward" size={16} color={tc.textTertiary} />
        </Pressable>
        <Pressable style={mps.cancelBtn} onPress={dismiss}>
          <Text style={mps.cancelText}>Cancel</Text>
        </Pressable>
      </Reanimated.View>
    </Modal>
  );
}

export const mps = createThemedStyles({
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 34, paddingTop: 10,
    shadowColor: palette.black, shadowOpacity: 0.25, shadowRadius: 20, elevation: 20,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: palette.gray300, alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 12, fontWeight: "600", textAlign: "center", marginBottom: 10, letterSpacing: 0.5, textTransform: "uppercase" },
  row: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: palette.brandBlueLight, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, fontSize: 16, fontWeight: "600" },
  cancelBtn: { marginHorizontal: 16, marginTop: 12, borderRadius: 14, backgroundColor: palette.gray100, paddingVertical: 14, alignItems: "center" },
  cancelText: { fontSize: 16, fontWeight: "700", color: palette.gray700 },
});
