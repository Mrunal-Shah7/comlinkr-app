// The iOS (and default) frame of DSheet: the universal @expo/ui BottomSheet, a SwiftUI sheet sized to its content.
// Android has its own frame in SheetFrame.android.tsx.
import type { ReactElement } from 'react';
import { BottomSheet, Host, RNHostView } from '@expo/ui';

export function SheetFrame({ visible, onClose, full, containerColor, colorScheme, children }: {
  visible: boolean; onClose: () => void; full?: boolean; containerColor: string; colorScheme: 'light' | 'dark'; children: ReactElement;
}) {
  return (
    <Host colorScheme={colorScheme} style={{ position: 'absolute', width: 0, height: 0 }} pointerEvents="box-none">
      <BottomSheet isPresented={visible} onDismiss={onClose} snapPoints={full ? ['full'] : undefined} contentPadding={0} containerColor={containerColor}>
        <RNHostView matchContents={{ vertical: true }}>{children}</RNHostView>
      </BottomSheet>
    </Host>
  );
}
