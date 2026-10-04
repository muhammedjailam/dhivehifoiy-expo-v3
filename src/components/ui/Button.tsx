import React from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { PressableScale } from './PressableScale';
import { Txt } from './Txt';
import { radius, useTheme } from '../../theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

export type ButtonProps = {
  title: string;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  size?: 'md' | 'lg' | 'sm';
  style?: StyleProp<ViewStyle>;
  flex?: boolean;
};

export function Button({ title, onPress, icon, variant = 'primary', loading, disabled, size = 'md', style, flex }: ButtonProps) {
  const t = useTheme();
  const palette: Record<Variant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: t.primary, fg: t.onPrimary },
    secondary: { bg: t.primarySoft, fg: t.primary },
    outline: { bg: 'transparent', fg: t.primary, border: t.primary },
    ghost: { bg: 'transparent', fg: t.text },
    danger: { bg: t.dangerSoft, fg: t.danger },
  };
  const c = palette[variant];
  const height = size === 'lg' ? 56 : size === 'sm' ? 40 : 48;

  return (
    <PressableScale
      haptic
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[
        styles.base,
        { height, backgroundColor: c.bg, borderColor: c.border ?? 'transparent', borderWidth: c.border ? 1.5 : 0 },
        flex && { flex: 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={c.fg} />
      ) : (
        <View style={styles.row}>
          {icon && <Ionicons name={icon} size={size === 'sm' ? 16 : 19} color={c.fg} />}
          <Txt variant="button" color={c.fg} numberOfLines={1} style={size === 'sm' && { fontSize: 14 }}>
            {title}
          </Txt>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
