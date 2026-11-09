// Split out of app/create-post.tsx (TR-013, point 9b).
import { palette } from "../../theme/palette";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { DSheet } from "../../shared/d/Sheet";
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
  // The native sheet (TR-017): close it first, then open the picker once it has slid away.
  const pick = (open: () => void) => {
    onClose();
    setTimeout(open, 250);
  };

  return (
    <DSheet visible={visible} onClose={onClose}>
      <View style={[mps.sheet, { backgroundColor: tc.sheetBg }]}>
        {title ? <Text style={[mps.title, { color: tc.textSecondary }]}>{title}</Text> : null}
        <Pressable style={[mps.row, { borderBottomColor: tc.borderLight }]} onPress={() => pick(onLibrary)}>
          <View style={mps.iconBox}>
            <Ionicons name="images-outline" size={22} color={palette.brandBlue} />
          </View>
          <Text style={[mps.rowText, { color: tc.textPrimary }]}>Photo Library</Text>
          <Ionicons name="chevron-forward" size={16} color={tc.textTertiary} />
        </Pressable>
        <Pressable style={[mps.row, { borderBottomColor: tc.borderLight }]} onPress={() => pick(onCamera)}>
          <View style={[mps.iconBox, { backgroundColor: palette.brandTealLight }]}>
            <Ionicons name="camera-outline" size={22} color={palette.brandTeal} />
          </View>
          <Text style={[mps.rowText, { color: tc.textPrimary }]}>Camera</Text>
          <Ionicons name="chevron-forward" size={16} color={tc.textTertiary} />
        </Pressable>
        <Pressable style={mps.cancelBtn} onPress={onClose}>
          <Text style={mps.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </DSheet>
  );
}

export const mps = createThemedStyles({
  sheet: { paddingBottom: 16, paddingTop: 4 },
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
