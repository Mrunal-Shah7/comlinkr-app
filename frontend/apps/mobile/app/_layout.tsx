// app/_layout.tsx

import { useEffect, useRef } from 'react';
import { LogBox, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useReducedMotion } from 'react-native-reanimated';
import { useFonts, Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { BricolageGrotesque_500Medium, BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import { DARK_THEME, LIGHT_THEME } from '../src/theme/useTheme';
import { Stack } from 'expo-router';

// Screens that own horizontal edge gestures (or are roots) don't get the iOS edge swipe-back.
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

// expo-video calls expo-keep-awake, which can fail to activate in Expo Go. Non-fatal: video still plays.
// Unhandled promise rejections are deliberately not muted, so a failing API call shows up in development.
LogBox.ignoreLogs(['Unable to activate keep awake']);

export default function RootLayout() {
  const hydrate      = useAuthStore((s) => s.hydrate);
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const hydrateBlock = useBlockStore((s) => s.hydrate);
  const hydrateGuestLocation = useGuestLocationStore((s) => s.hydrate);
  const isDark       = useThemeStore((s) => s.isDark);
  const themeHydrated = useThemeStore((s) => s._hydrated);
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const authLoading = useAuthStore((s) => s.isLoading);
  const setPushToken = useAuthStore((s) => s.setPushToken);
  const wasAuthedRef = useRef(false);
  const pushRegisteredRef = useRef(false);

  // Design D fonts (plan 01): Manrope for text, Bricolage Grotesque for headings.
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold,
    BricolageGrotesque_500Medium, BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold,
  });
  const reduceMotion = useReducedMotion();

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
  // A font that fails to load falls back to the system font rather than blocking the app.
  // Also wait for the stored session: a deep link (a notification, a shared link) straight into a signed-in
  // screen rendered before hydrate() and redirected a signed-in user to the login screen.
  if (!themeHydrated || authLoading || (!fontsLoaded && !fontError)) return null;
  const pageBg = isDark ? DARK_THEME.pageBg : LIGHT_THEME.pageBg;

  return (
    // The root must be painted: during a stack pop the leaving screen can go blank before its slide-out
    // finishes, and a transparent root shows the white Android window behind the app.
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: isDark ? DARK_THEME.pageBg : LIGHT_THEME.pageBg }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          {/* Android: hide the navigation bar; a swipe up from the bottom edge shows it for a moment (immersive). */}
          <NavigationBar hidden />
          <ErrorBoundary>
            {/* Plan 02: the native stack, with the platform's own push animation (edge swipe back on iOS, system Back
                on Android). With reduce motion on, screens fade. */}
            <Stack
              screenOptions={({ route }) => ({
                headerShown: false,
                contentStyle: { backgroundColor: pageBg },
                animation: reduceMotion ? 'fade' : 'default',
                gestureEnabled: !NO_EDGE_SWIPE.has(route.name),
              })}
            >
              {/* TR-017: the photo gallery fades in over the screen that opened it (its own drag down closes it);
                  the post preview is the native form sheet over the compose form. */}
              <Stack.Screen name="gallery" options={{ presentation: 'transparentModal', animation: 'fade', gestureEnabled: false, contentStyle: { backgroundColor: 'transparent' } }} />
              <Stack.Screen
                name="compose-preview"
                options={{ presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: [0.92], sheetCornerRadius: 28 }}
              />
            </Stack>
            <ToastHost />
            <DialogHost />
          </ErrorBoundary>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
