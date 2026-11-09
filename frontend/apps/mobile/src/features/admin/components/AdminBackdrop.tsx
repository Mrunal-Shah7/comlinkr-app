// Themed page backdrop shared by every admin screen (replaces per-page light-only gradients).
import { palette } from "../../../theme/palette";
import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@theme/useTheme';

export function AdminBackdrop() {
  const { isDark, tc } = useTheme();
  const colors = isDark
    ? ([tc.pageBg, tc.pageBg, tc.sectionBg] as const)
    : ([palette.legacyBlueLight, palette.neutralL98, palette.greenL95] as const);
  return <LinearGradient colors={colors} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />;
}

export default AdminBackdrop;
