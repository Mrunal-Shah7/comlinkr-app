// src/hooks/useRefetchOnFocus.ts
//
// React Query refetches on app foreground (focusManager) and on mount, but a stack screen that stays mounted
// under another one does not remount when the user comes back. This refetches stale queries when the screen
// regains focus, skipping the first focus (the mount already fetched).

import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

export function useRefetchOnFocus(refetch: () => unknown, enabled = true): void {
  const first = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      if (enabled) void refetch();
    }, [refetch, enabled]),
  );
}
