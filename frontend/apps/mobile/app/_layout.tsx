// app/_layout.tsx

import { useEffect, useRef } from 'react';
import { LogBox, useWindowDimensions } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DARK_THEME, LIGHT_THEME } from '../src/theme/useTheme';
import { EdgeSwipeBack } from '../src/shared/ui/EdgeSwipeBack';

// Screens that own horizontal edge gestures (or are roots) don't get Android edge swipe-back.
const NO_EDGE_SWIPE = new Set(['index', '(tabs)', '(auth)', 'story-viewer']);
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../src/services/cache/queryClient';
import { useAuthStore } from '../src/store/auth.store';
import { useThemeStore } from '../src/store/theme.store';
import { useBlockStore } from '../src/store/block.store';
import { useGuestLocationStore } from '../src/store/guestLocation.store';
import { useSidebarStore } from '../src/store/sidebar.store';
import { registerForPushNotificationsAsync } from '../src/utils/pushNotifications';
import { registerPushToken } from '../src/api/users.api';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ToastHost } from '../src/shared/ui/Toast';
import { DialogHost } from '../src/shared/ui/Dialogs';
import {
  connectMessagingSocket,
  disconnectMessagingSocket,
} from '../src/services/messagingSocket'; // SPRINT-39:

// expo-video (3.x) internally calls expo-keep-awake which isn't registered
// in Expo Go on SDK 54. The error is non-fatal — video still plays.
LogBox.ignoreLogs([
  'Unable to activate keep awake',
  'Uncaught (in promise',
]);

export default function RootLayout() {
  const hydrate      = useAuthStore((s) => s.hydrate);
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const hydrateBlock = useBlockStore((s) => s.hydrate);
  const hydrateGuestLocation = useGuestLocationStore((s) => s.hydrate);
  const isDark       = useThemeStore((s) => s.isDark);
  const themeHydrated = useThemeStore((s) => s._hydrated);
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const setPushToken = useAuthStore((s) => s.setPushToken);
  const wasAuthedRef = useRef(false);
  const pushRegisteredRef = useRef(false);

  // Root listener to recalculate dimensions on rotate/resize
  useWindowDimensions();

  useEffect(() => {
    hydrate();
    hydrateTheme();
    hydrateBlock();
    hydrateGuestLocation();
  }, []);

  useEffect(() => {
    if (!wasAuthedRef.current && isAuthed) {
      void useSidebarStore.getState().fetchSidebarData();
    }
    wasAuthedRef.current = isAuthed;
  }, [isAuthed]);

  useEffect(() => {
    if (!isAuthed || pushRegisteredRef.current) {
      if (!isAuthed) pushRegisteredRef.current = false;
      return;
    }
    pushRegisteredRef.current = true;
    registerForPushNotificationsAsync()
      .then((token) => {
        if (!token) return;
        setPushToken(token);
        return registerPushToken(token);
      })
      .catch(() => {
        // no-op: push registration should never block auth flow
      });
  }, [isAuthed, setPushToken]);

  // SPRINT-39: one socket per authenticated session — connect after auth, tear down on sign-out
  useEffect(() => {
    if (isAuthed) {
      void connectMessagingSocket();
      return;
    }
    disconnectMessagingSocket();
  }, [isAuthed]);

  // UI-10: wait for the persisted theme so the app never flashes the wrong palette on start.
  if (!themeHydrated) return null;

  return (
    // The root must be painted: during a stack pop the leaving screen can go blank before its slide-out
    // finishes, and a transparent root shows the white Android window behind the app.
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: isDark ? DARK_THEME.pageBg : LIGHT_THEME.pageBg }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <ErrorBoundary>
            <Stack
              screenLayout={({ children, route, navigation }) => (
                <EdgeSwipeBack
                  enabled={!NO_EDGE_SWIPE.has(route.name) && navigation.canGoBack()}
                  onBack={() => navigation.goBack()}
                >
                  {children}
                </EdgeSwipeBack>
              )}
              screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                animationDuration: 260,
                // iOS keeps its native edge swipe-back; Android gets EdgeSwipeBack (screenLayout above).
                contentStyle: { backgroundColor: isDark ? DARK_THEME.pageBg : LIGHT_THEME.pageBg },
              }}
            />
            <ToastHost />
            <DialogHost />
          </ErrorBoundary>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
