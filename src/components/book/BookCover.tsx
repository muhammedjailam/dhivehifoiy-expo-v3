import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import Animated, { SharedTransition } from 'react-native-reanimated';
import { useShadow, useTheme } from '../../theme';

export const COVER_RATIO = 0.7; // width / height

const AnimatedImage = Animated.createAnimatedComponent(Image);

/** Spring-y morph used for every cover → detail transition. */
export const coverTransition = SharedTransition.duration(420);

type Props = {
  uri?: string | null;
  width: number;
  /** sharedTransitionTag – must be unique on screen. */
  tag?: string;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  shadow?: 0 | 1 | 2 | 3;
  children?: React.ReactNode;
  accessibilityLabel?: string;
};

export function BookCover({ uri, width, tag, radius = 10, style, shadow = 2, children, accessibilityLabel }: Props) {
  const t = useTheme();
  const shadowStyle = useShadow(shadow === 0 ? 1 : shadow);
  const height = Math.round(width / COVER_RATIO);

  return (
    <View
      style={[
        { width, height, borderRadius: radius, backgroundColor: t.skeleton },
        shadow ? shadowStyle : null,
        style,
      ]}
    >
      <AnimatedImage
        source={uri ? { uri } : undefined}
        sharedTransitionTag={tag}
        sharedTransitionStyle={tag ? (coverTransition as any) : undefined}
        style={{ width, height, borderRadius: radius }}
        contentFit="cover"
        transition={220}
        cachePolicy="memory-disk"
        recyclingKey={uri ?? undefined}
        accessibilityLabel={accessibilityLabel}
      />
      {/* Subtle spine highlight so covers read as physical books */}
      <View pointerEvents="none" style={[styles.spine, { borderTopStartRadius: radius, borderBottomStartRadius: radius }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  spine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    start: 0, // binding edge: right side for RTL (Dhivehi) books
    width: 4,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
});
