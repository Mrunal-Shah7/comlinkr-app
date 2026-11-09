// src/hooks/useRefetchOnFocus.ts
//
// React Query refetches on app foreground (focusManager) and on mount, but a tab or stack screen that stays
// mounted does not remount when the user comes back to it. This refetches the screen's queries when it regains
// focus, but only those that are stale (so a 10-minute `staleTime` still means no request on a quick tab switch),
// skipping the first focus (the mount already fetched). TanStack's React Navigation pattern.

import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';

export function useRefetchOnFocus(queryKey: QueryKey, enabled = true): void {
  const qc = useQueryClient();
  const first = useRef(true);
  const keyRef = useRef(queryKey);
  keyRef.current = queryKey;
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      if (enabled) void qc.refetchQueries({ queryKey: keyRef.current, stale: true, type: 'active' });
    }, [qc, enabled]),
  );
}
