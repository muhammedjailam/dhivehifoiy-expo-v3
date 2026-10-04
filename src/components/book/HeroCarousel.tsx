import React, { useEffect, useRef, useState } from 'react';
import { Animated, I18nManager, StyleSheet, useWindowDimensions, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { PressableScale } from '../ui/PressableScale';
import { Skeleton } from '../ui/Skeleton';
import { openLink } from '../../lib/nav';
import { radius, useTheme } from '../../theme';
import type { Slide } from '../../types';

const AnimatedPager = Animated.createAnimatedComponent(PagerView);

/** Auto-advancing native pager for the home slides (4:3 like v2). */
export function HeroCarousel({ slides, loading }: { slides?: Slide[]; loading?: boolean }) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - 32, 720);
  const height = Math.round(cardWidth / 1.6);
  const pager = useRef<PagerView>(null);
  const [page, setPage] = useState(0);
  const position = useRef(new Animated.Value(0)).current;
  const offset = useRef(new Animated.Value(0)).current;
  const interacting = useRef(false);

  const count = slides?.length ?? 0;

  useEffect(() => {
    if (count < 2) return;
    const id = setInterval(() => {
      if (!interacting.current) pager.current?.setPage((page + 1) % count);
    }, 5500);
    return () => clearInterval(id);
  }, [page, count]);

  if (loading && !count) {
    return (
      <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
        <Skeleton height={height} radius={radius.xl} />
      </View>
    );
  }
  if (!count) return null;

  const scrollX = Animated.add(position, offset);

  return (
    <View style={{ marginTop: 8 }}>
      <AnimatedPager
        ref={pager}
        style={{ height, width }}
        initialPage={0}
        layoutDirection={I18nManager.isRTL ? 'rtl' : 'ltr'}
        onPageSelected={(e: any) => setPage(e.nativeEvent.position)}
        onPageScrollStateChanged={(e: any) => {
          interacting.current = e.nativeEvent.pageScrollState === 'dragging';
        }}
        onPageScroll={Animated.event([{ nativeEvent: { position, offset } }], { useNativeDriver: true })}
      >
        {slides!.map((slide, index) => {
          const scale = scrollX.interpolate({
            inputRange: [index - 1, index, index + 1],
            outputRange: [0.92, 1, 0.92],
            extrapolate: 'clamp',
          });
          return (
            <View key={slide.id ?? index} style={{ alignItems: 'center' }}>
              <Animated.View style={{ transform: [{ scale }] }}>
                <PressableScale
                  scaleTo={0.98}
                  onPress={() => openLink(slide.url)}
                  style={[styles.card, { width: cardWidth, height, backgroundColor: t.skeleton }]}
                  accessibilityLabel={slide.name}
                >
                  <Image source={{ uri: slide.slide_image_url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.25)']} style={StyleSheet.absoluteFill} />
                </PressableScale>
              </Animated.View>
            </View>
          );
        })}
      </AnimatedPager>
      <View style={styles.dots}>
        {slides!.map((_, index) => {
          const dotWidth = scrollX.interpolate({
            inputRange: [index - 1, index, index + 1],
            outputRange: [6, 18, 6],
            extrapolate: 'clamp',
          });
          const opacity = scrollX.interpolate({
            inputRange: [index - 1, index, index + 1],
            outputRange: [0.35, 1, 0.35],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View
              key={index}
              style={[styles.dot, { backgroundColor: t.primary, opacity, transform: [{ scaleX: Animated.divide(dotWidth, 6) }] }]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, overflow: 'hidden' },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 10, height: 8 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
