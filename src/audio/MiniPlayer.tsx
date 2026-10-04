import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useSegments } from 'expo-router';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { useProgress } from 'react-native-track-player';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAudio } from './AudioProvider';
import { PressableScale } from '../components/ui/PressableScale';
import { Txt } from '../components/ui/Txt';
import { radius, useShadow, useTheme } from '../theme';

export const MINI_PLAYER_HEIGHT = 64;
export const TAB_BAR_HEIGHT = 64;

const HIDDEN_ON = new Set(['reader', 'listen', 'payments']);

export function useMiniPlayerVisible() {
  const { activeTrack } = useAudio();
  const segments = useSegments() as string[];
  if (!activeTrack) return false;
  if (!segments.length) return false; // sign-in screen
  return !segments.some((s) => HIDDEN_ON.has(s));
}

/** Floating "now playing" card that sits above the tab bar (or the home indicator). */
export function MiniPlayer() {
  const t = useTheme();
  const shadow = useShadow(3);
  const insets = useSafeAreaInsets();
  const segments = useSegments() as string[];
  const visible = useMiniPlayerVisible();
  const { activeTrack, activeBookUuid, isPlaying, isBuffering, toggle, stop } = useAudio();

  if (!visible || !activeTrack) return null;
  const inTabs = segments[0] === '(tabs)';
  const bottom = insets.bottom + 8 + (inTabs ? TAB_BAR_HEIGHT + 8 : 0);
  const track = activeTrack as any;

  return (
    <Animated.View
      entering={SlideInDown.springify().damping(18)}
      exiting={SlideOutDown.duration(200)}
      style={[styles.wrap, { bottom }, shadow]}
      pointerEvents="box-none"
    >
      <PressableScale
        scaleTo={0.98}
        onPress={() => activeBookUuid && router.push({ pathname: '/books/listen/[uuid]', params: { uuid: activeBookUuid } })}
        style={[styles.card, { borderColor: t.border }]}
      >
        <BlurView intensity={60} tint={t.scheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: t.tabBar }]} />
        <Image source={{ uri: track.artwork }} style={styles.art} contentFit="cover" />
        <View style={{ flex: 1 }}>
          <Txt variant="label" numberOfLines={1}>
            {track.title_dv || track.title}
          </Txt>
          <Txt variant="caption" tone="muted" numberOfLines={1} style={{ marginTop: -3 }}>
            {track.album_dv || track.album}
          </Txt>
        </View>
        <PressableScale haptic onPress={toggle} hitSlop={8} style={[styles.play, { backgroundColor: t.primary }]}>
          {isBuffering ? (
            <ActivityIndicator size="small" color={t.onPrimary} />
          ) : (
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color={t.onPrimary} />
          )}
        </PressableScale>
        <PressableScale haptic onPress={stop} hitSlop={8} style={styles.close}>
          <Ionicons name="close" size={20} color={t.textMuted} />
        </PressableScale>
        <MiniProgress />
      </PressableScale>
    </Animated.View>
  );
}

function MiniProgress() {
  const t = useTheme();
  const { position, duration } = useProgress(1000);
  const pct = duration > 0 ? Math.min(1, position / duration) : 0;
  return (
    <View style={[styles.progressTrack, { backgroundColor: t.border }]}>
      <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: t.primary }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12 },
  card: {
    height: MINI_PLAYER_HEIGHT,
    borderRadius: radius.lg,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  art: { width: 44, height: 44, borderRadius: 10 },
  play: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  close: { width: 32, height: 38, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 2 },
});
