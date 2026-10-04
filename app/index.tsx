import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Linking, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin';
import { useAuth } from '@/src/providers/AuthProvider';
import { PressableScale } from '@/src/components/ui/PressableScale';
import { Txt } from '@/src/components/ui/Txt';
import { GOOGLE_WEB_CLIENT_ID, toInternalRoute } from '@/src/config';
import { isOnline } from '@/src/lib/api';
import { consumeLaunchNotificationUrl } from '@/src/lib/notifications';
import { brand, radius } from '@/src/theme';

export default function SignIn() {
  const { status, signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);
  const drift = useSharedValue(0);

  useEffect(() => {
    drift.value = withRepeat(withTiming(1, { duration: 40000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [drift]);

  const bgStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -drift.value * height * 0.35 }, { scale: 1.1 }],
  }));

  // Signed in → route into the app (notification deep-link, or library when offline – same as v2).
  useFocusEffect(
    React.useCallback(() => {
      if (status !== 'signedIn' || started.current) return;
      started.current = true;
      (async () => {
        const url = await consumeLaunchNotificationUrl();
        if (url) {
          const internal = toInternalRoute(url);
          router.replace('/home');
          if (internal) setTimeout(() => router.push(internal as any), 50);
          else Linking.openURL(url).catch(() => {});
          return;
        }
        router.replace((await isOnline()) ? '/home' : '/my-books');
      })();
      return () => {
        started.current = false;
      };
    }, [status]),
  );

  const googleSignIn = async () => {
    setError(null);
    setBusy(true);
    try {
      GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, offlineAccess: true });
      await GoogleSignin.hasPlayServices();
      const response: any = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) {
        setBusy(false);
        return;
      }
      const code = response.data.serverAuthCode;
      if (!code) throw new Error('No server auth code');
      await signIn('google', code);
    } catch (e: any) {
      if (isErrorWithCode(e) && e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError('Google Play Services ބޭނުންކުރެވޭ ގޮތް ހަދައިދެއްވާ');
      } else if (!(isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED)) {
        setError('ގޫގުލް މެދުވެރިކޮށް ލޮގިން ނުކުރެވުނު');
      }
      setBusy(false);
    }
  };

  const appleSignIn = async () => {
    setError(null);
    setBusy(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      });
      if (!credential.identityToken) throw new Error('No identity token');
      await signIn('apple', credential.identityToken);
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') setError('އެޕަލް މެދުވެރިކޮށް ލޮގިން ނުކުރެވުނު');
      setBusy(false);
    }
  };

  const signedIn = status === 'signedIn';

  return (
    <View style={styles.root}>
      <Animated.Image
        source={require('../assets/images/bg.jpg')}
        resizeMode="cover"
        style={[styles.bg, { height: height * 1.6 }, bgStyle]}
      />
      <LinearGradient colors={['rgba(74,37,116,0.55)', 'rgba(74,37,116,0.85)', brand.purpleDeep]} style={StyleSheet.absoluteFill} />

      <View style={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}>
        <View />
        <Animated.View entering={FadeInDown.duration(900)} style={styles.brand}>
          <Image source={require('../assets/images/logo.png')} resizeMode="contain" tintColor="#fff" style={styles.logo} />
          {!signedIn && (
            <Animated.View entering={FadeIn.delay(500).duration(800)}>
              <Txt variant="subheading" color="rgba(255,255,255,0.85)" center>
                ދިވެހި ފޮތްތައް، އެއްތަނެއްގައި
              </Txt>
            </Animated.View>
          )}
        </Animated.View>

        {signedIn ? (
          <ActivityIndicator color="#fff" size="large" />
        ) : (
          <Animated.View entering={FadeInDown.delay(700).duration(800)} style={styles.actions}>
            {Platform.OS === 'ios' ? (
              <SignInButton
                label="އެޕަލް މެދުވެރިކޮށް ލޮގިންކުރައްވާ"
                logo={require('../assets/images/apple-logo.png')}
                onPress={appleSignIn}
                busy={busy}
              />
            ) : (
              <SignInButton
                label="ގޫގުލް މެދުވެރިކޮށް ލޮގިންކުރައްވާ"
                logo={require('../assets/images/g-logo.png')}
                onPress={googleSignIn}
                busy={busy}
              />
            )}
            {!!error && (
              <Animated.View entering={FadeIn} style={styles.error}>
                <Txt variant="bodySmall" color="#fff" center>
                  {error}
                </Txt>
              </Animated.View>
            )}
          </Animated.View>
        )}
      </View>
    </View>
  );
}

function SignInButton({ label, logo, onPress, busy }: { label: string; logo: number; onPress: () => void; busy: boolean }) {
  return (
    <PressableScale haptic onPress={onPress} disabled={busy} style={styles.signIn} accessibilityLabel={label}>
      {busy ? (
        <ActivityIndicator color="#000" />
      ) : (
        <>
          <Image source={logo} resizeMode="contain" style={{ width: 24, height: 24 }} />
          <Txt variant="button" color="#111">
            {label}
          </Txt>
        </>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: brand.purpleDeep, overflow: 'hidden' },
  bg: { position: 'absolute', top: 0, left: 0, right: 0, width: '100%' },
  content: { flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24 },
  brand: { alignItems: 'center', gap: 8 },
  logo: { width: 180, height: 128 },
  actions: { width: '100%', maxWidth: 380, gap: 14 },
  signIn: {
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  error: { backgroundColor: 'rgba(217,63,76,0.35)', borderRadius: radius.md, padding: 10 },
});
