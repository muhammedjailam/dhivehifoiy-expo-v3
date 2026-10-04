import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { IconButton } from './IconButton';
import { Txt } from './Txt';
import { backIcon, useTheme } from '../../theme';

type Props = {
  title?: string;
  subtitle?: string;
  back?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  /** When provided, a hairline + title fade in as content scrolls under the header. */
  scrollY?: SharedValue<number>;
  /** Hide the title until scrolled (for screens with a big in-content title). */
  collapsedTitle?: boolean;
  transparent?: boolean;
};

export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/home');
}

export function BackButton({ onPress, variant = 'tonal' }: { onPress?: () => void; variant?: 'tonal' | 'glass' | 'plain' }) {
  return (
    <IconButton
      name={backIcon() as any}
      variant={variant}
      size={22}
      onPress={onPress ?? goBack}
      accessibilityLabel="ފަހަތަށް"
    />
  );
}

export function ScreenHeader({ title, subtitle, back = true, onBack, right, scrollY, collapsedTitle, transparent }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  const borderStyle = useAnimatedStyle(() => ({
    opacity: scrollY ? interpolate(scrollY.value, [0, 24], [0, 1], 'clamp') : 0,
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: collapsedTitle && scrollY ? interpolate(scrollY.value, [40, 110], [0, 1], 'clamp') : 1,
    transform: [{ translateY: collapsedTitle && scrollY ? interpolate(scrollY.value, [40, 110], [6, 0], 'clamp') : 0 }],
  }));

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 6, backgroundColor: transparent ? 'transparent' : t.bg }]}>
      <View style={styles.row}>
        <View style={styles.side}>{back && <BackButton onPress={onBack} />}</View>
        <Animated.View style={[styles.titleWrap, titleStyle]}>
          {!!title && (
            <Txt variant="heading" numberOfLines={1} center>
              {title}
            </Txt>
          )}
          {!!subtitle && (
            <Txt variant="caption" tone="muted" numberOfLines={1} center>
              {subtitle}
            </Txt>
          )}
        </Animated.View>
        <View style={[styles.side, styles.sideEnd]}>{right}</View>
      </View>
      <Animated.View style={[styles.hairline, { backgroundColor: t.border }, borderStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { zIndex: 10 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 8, minHeight: 52 },
  side: { minWidth: 44, flexDirection: 'row', alignItems: 'center', gap: 4 },
  sideEnd: { justifyContent: 'flex-end' },
  titleWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  hairline: { height: StyleSheet.hairlineWidth },
});
