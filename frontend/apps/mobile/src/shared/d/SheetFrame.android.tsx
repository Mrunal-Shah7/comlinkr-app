// The Android frame of DSheet (plan 07, TR-041): no native sheet. A native sheet opens its own Android window, which
// shows the navigation bar the app hides (plan 04), so the content goes to the in-window sheet portal instead
// (SheetPortal.tsx), drawn above every screen and the tab bar by <SheetPortalHost /> at the root.
// TR-017's Material ModalBottomSheet frame, with its keyboard and navigation bar measuring, is in git history.
import { useEffect, useId, useLayoutEffect, type ReactElement } from 'react';
import { useSheetPortal } from './SheetPortal';

export function SheetFrame({ visible, onClose, containerColor, children }: {
  visible: boolean; onClose: () => void; full?: boolean; containerColor: string; colorScheme: 'light' | 'dark'; children: ReactElement;
}) {
  const id = useId();
  // Hand the latest content to the portal on every render, so the sheet follows the screen's state.
  useLayoutEffect(() => {
    useSheetPortal.getState().put(id, { kind: 'sheet', visible, onClose, containerColor, children });
  });
  useEffect(() => () => useSheetPortal.getState().remove(id), [id]);
  return null;
}
