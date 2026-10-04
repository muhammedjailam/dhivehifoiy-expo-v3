import React, { useEffect, useMemo } from 'react';
import { AppState, I18nManager, Platform } from 'react-native';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useGlobalSearchParams, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { focusManager, onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import TrackPlayer from 'react-native-track-player';
import { getAnalytics, logScreenView } from '@react-native-firebase/analytics';
import { AppThemeProvider, useTheme } from '@/src/theme';
import { AuthProvider, useAuth } from '@/src/providers/AuthProvider';
import { AudioProvider } from '@/src/audio/AudioProvider';
import { MiniPlayer } from '@/src/audio/MiniPlayer';
import PlaybackService from '@/src/audio/service';
import { ToastProvider, toast } from '@/src/components/ui/Toast';
import { PortalHost } from '@/src/components/ui/Portal';
import { ApiError } from '@/src/lib/api';
import { onDownloadEvent, reconcileDownloads } from '@/src/lib/downloads';
import { sweepTemporaryFiles } from '@/src/lib/vault';
import { setupNotificationResponder } from '@/src/lib/notifications';

SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ fade: true, duration: 250 });

// The UI is Dhivehi only: lay everything out right-to-left. The expo-localization
// plugin applies this natively on first launch; this keeps it enforced afterwards.
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

TrackPlayer.registerPlaybackService(() => PlaybackService);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: (count, error) => {
        if (error instanceof ApiError && error.status < 500) return false;
        return count < 2;
      },
    },
  },
});

onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(state.isConnected !== false)),
);

function useAppStateFocus() {
  useEffect(() => {
    const sub = AppState.addEventListener('change', (status) => {
      if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
    });
    return () => sub.remove();
  }, []);
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    MVWaheed: require('../assets/fonts/MVWaheed.otf'),
    MVFaseyha: require('../assets/fonts/MVFaseyha.otf'),
  });

  useAppStateFocus();

  useEffect(() => {
    // Remove any plaintext leftovers from a previous session, then verify the vault.
    sweepTemporaryFiles();
    reconcileDownloads();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AppThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <PortalHost>
                <AudioProvider>
                  {/* Fonts are also embedded natively; never block on a load error. */}
                  <AppShell ready={fontsLoaded || !!fontError} />
                </AudioProvider>
              </PortalHost>
            </ToastProvider>
          </AuthProvider>
        </AppThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

function AppShell({ ready }: { ready: boolean }) {
  const t = useTheme();
  const { status } = useAuth();
  const loaded = ready && status !== 'loading';
  const signedIn = status === 'signedIn';

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  // Subscribe only once the navigator is mounted, so a cold-start tap can navigate safely.
  useEffect(() => (loaded ? setupNotificationResponder() : undefined), [loaded]);

  useEffect(
    () =>
      onDownloadEvent((e) => {
        if (e.type === 'done') toast(`"${e.name_dv}" އޮފްލައިންކޮށް ކިޔޭނެ`, { kind: 'success' });
        else toast(e.message ?? 'ޑައުންލޯޑް ނުކުރެވުނު', { kind: 'error' });
      }),
    [],
  );

  useScreenAnalytics();

  const navTheme = useMemo(() => {
    const base = t.scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: { ...base.colors, primary: t.primary, background: t.bg, card: t.surface, text: t.text, border: t.border },
    };
  }, [t]);

  // Keep the splash screen until fonts + session are known (avoids flashing the sign-in screen
  // and lets deep links resolve against the right guard).
  if (!loaded) return null;

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.bg },
          animation: Platform.OS === 'android' ? 'fade_from_bottom' : 'default',
        }}
      >
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="books/[slug]" options={{ animation: 'default' }} />
          <Stack.Screen name="books/index" />
          <Stack.Screen
            name="books/reader/[uuid]"
            options={{ animation: 'fade', gestureEnabled: false, contentStyle: { backgroundColor: '#000' }, orientation: 'all' }}
          />
          <Stack.Screen name="books/listen/[uuid]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="authors/[slug]" />
          <Stack.Screen name="genre/[slug]" />
          <Stack.Screen name="collections/[slug]" />
          <Stack.Screen name="pages/[slug]" />
          <Stack.Screen name="payments/pay" options={{ presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: false }} />
          <Stack.Screen name="downloads" />
          <Stack.Screen name="bookmarks" />
        </Stack.Protected>
      </Stack>
      <MiniPlayer />
    </ThemeProvider>
  );
}

function useScreenAnalytics() {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  useEffect(() => {
    logScreenView(getAnalytics(), { screen_name: pathname, screen_class: pathname }).catch(() => {});
  }, [pathname, params]);
}
