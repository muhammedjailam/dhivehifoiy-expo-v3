import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { PressableScale } from './PressableScale';
import { useTheme } from '../../theme';

export type IconName = keyof typeof Ionicons.glyphMap;

type Props = {
  name: IconName;
  onPress?: () => void;
  size?: number;
  color?: string;
  /** glass = blurred translucent circle (for use over images) */
  variant?: 'plain' | 'tonal' | 'glass' | 'solid';
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  children?: React.ReactNode;
};

export function IconButton({ name, onPress, size = 22, color, variant = 'plain', accessibilityLabel, style, disabled, children }: Props) {
  const t = useTheme();
  const dim = size + 20;
  const fg = color ?? (variant === 'glass' ? '#fff' : variant === 'solid' ? t.onPrimary : t.text);

  return (
    <PressableScale
      haptic
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? name}
      scaleTo={0.88}
      style={[{ width: dim, height: dim, borderRadius: dim / 2 }, styles.base, style]}
    >
      {variant === 'glass' && (
        <BlurView intensity={40} tint="dark" style={[StyleSheet.absoluteFill, { borderRadius: dim / 2, overflow: 'hidden' }]} />
      )}
      {variant === 'glass' && <View style={[StyleSheet.absoluteFill, styles.glassTint, { borderRadius: dim / 2 }]} />}
      {variant === 'tonal' && <View style={[StyleSheet.absoluteFill, { backgroundColor: t.surfaceAlt, borderRadius: dim / 2 }]} />}
      {variant === 'solid' && <View style={[StyleSheet.absoluteFill, { backgroundColor: t.primary, borderRadius: dim / 2 }]} />}
      <Ionicons name={name} size={size} color={fg} />
      {children}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  glassTint: { backgroundColor: 'rgba(0,0,0,0.18)' },
});
