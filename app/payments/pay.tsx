import React, { useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import * as Linking from 'expo-linking';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { LoadingView } from '@/src/components/ui/misc';
import { useTheme } from '@/src/theme';

/** Bank payment page (same redirect rules as v2). */
export default function Pay() {
  const t = useTheme();
  const { payment_url, slug } = useLocalSearchParams<{ payment_url: string; slug: string }>();
  const [progress, setProgress] = useState(0);
  const done = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    // Back to the book page, which refreshes ownership on focus.
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/books/[slug]', params: { slug } });
  };

  const onNavigation = async (state: WebViewNavigation) => {
    const { url } = state;
    if (!url) return;
    if (url.includes('pay.bml.com.mv/app')) {
      await Linking.openURL(url).catch(() => {});
    }
    if (url !== payment_url && (url.includes('dhivehifoiy.mv') || url.includes('google.com') || url.includes('apple.com'))) {
      finish();
    }
  };

  const close = () =>
    Alert.alert('ފައިސާ ދެއްކުން ހުއްޓާލަންތަ؟', undefined, [
      { text: 'ނޫން', style: 'cancel' },
      { text: 'ހުއްޓާލާ', style: 'destructive', onPress: () => router.back() },
    ]);

  const bar = useAnimatedStyle(() => ({
    width: `${progress * 100}%`,
    opacity: withTiming(progress >= 1 ? 0 : 1, { duration: 300 }),
  }));

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader title="ފައިސާ ދެއްކުން" onBack={close} right={null} />
      <View style={{ height: 2 }}>
        <Animated.View style={[styles.bar, { backgroundColor: t.primary }, bar]} />
      </View>
      {payment_url ? (
        <WebView
          originWhitelist={['*']}
          style={{ flex: 1 }}
          source={{ uri: payment_url }}
          onNavigationStateChange={onNavigation}
          onLoadProgress={(e) => setProgress(e.nativeEvent.progress)}
          startInLoadingState
          renderLoading={() => <LoadingView />}
          sharedCookiesEnabled
        />
      ) : (
        <LoadingView />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 2 },
});
