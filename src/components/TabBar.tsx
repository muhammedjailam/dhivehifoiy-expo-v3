import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { PressableScale } from './ui/PressableScale';
import { Txt } from './ui/Txt';
import { TAB_BAR_HEIGHT } from '../audio/MiniPlayer';
import { radius, useShadow, useTheme } from '../theme';
import type { IconName } from './ui/IconButton';

const TABS: Record<string, { label: string; icon: IconName; active: IconName }> = {
  home: { label: 'މައި ސަފްޙާ', icon: 'home-outline', active: 'home' },
  search: { label: 'ހޯދާ', icon: 'search-outline', active: 'search' },
  'my-books': { label: 'މަގޭ ފޮތް', icon: 'library-outline', active: 'library' },
  menu: { label: 'މެނޫ', icon: 'person-circle-outline', active: 'person-circle' },
};

/** Floating glass tab bar with springy active pill. */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const shadow = useShadow(3);

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + 8 }]}>
      <View style={[styles.bar, { borderColor: t.border }, shadow]}>
        <BlurView intensity={70} tint={t.scheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: t.tabBar }]} />
        {state.routes.map((route, index) => {
          const meta = TABS[route.name];
          if (!meta) return null;
          const focused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name as never);
          };
          return <TabItem key={route.key} meta={meta} focused={focused} onPress={onPress} />;
        })}
      </View>
    </View>
  );
}

function TabItem({ meta, focused, onPress }: { meta: (typeof TABS)[string]; focused: boolean; onPress: () => void }) {
  const t = useTheme();
  const active = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    active.value = focused ? withSpring(1, { damping: 16, stiffness: 220 }) : withTiming(0, { duration: 160 });
  }, [focused, active]);

  const pill = useAnimatedStyle(() => ({
    opacity: active.value,
    transform: [{ scaleX: 0.6 + active.value * 0.4 }, { scaleY: 0.8 + active.value * 0.2 }],
  }));
  const icon = useAnimatedStyle(() => ({ transform: [{ translateY: -active.value * 1.5 }, { scale: 1 + active.value * 0.06 }] }));

  return (
    <PressableScale haptic onPress={onPress} style={styles.item} scaleTo={0.9} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={meta.label}>
      <Animated.View style={[styles.pill, { backgroundColor: t.primarySoft }, pill]} />
      <Animated.View style={icon}>
        <Ionicons name={focused ? meta.active : meta.icon} size={22} color={focused ? t.primary : t.textMuted} />
      </Animated.View>
      <Txt variant="caption" color={focused ? t.primary : t.textMuted} style={styles.label} numberOfLines={1}>
        {meta.label}
      </Txt>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  bar: {
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
    width: '92%',
    maxWidth: 520,
    borderRadius: radius.xl,
    overflow: 'hidden',
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  item: { flex: 1, height: TAB_BAR_HEIGHT - 12, alignItems: 'center', justifyContent: 'center' },
  pill: { position: 'absolute', top: 0, bottom: 0, left: 4, right: 4, borderRadius: radius.lg },
  label: { fontSize: 10.5, lineHeight: 17, marginTop: -1 },
});
