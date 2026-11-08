// src/shared/ui/Switch.tsx — the platform's own toggle from @expo/ui (plan 02): a SwiftUI Toggle on iOS, a
// Material 3 Switch on Android. Coloured from the app's accent through the Host's seed colour.
import { Host, Switch as NativeSwitch } from '@expo/ui';
import { useTheme } from '../../theme/useTheme';

export function Switch({ value, onValueChange, disabled, accessibilityLabel }: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const { isDark, tc } = useTheme();
  return (
    <Host matchContents colorScheme={isDark ? 'dark' : 'light'} seedColor={tc.mint} accessibilityLabel={accessibilityLabel}>
      <NativeSwitch value={value} onValueChange={onValueChange} disabled={disabled} />
    </Host>
  );
}
