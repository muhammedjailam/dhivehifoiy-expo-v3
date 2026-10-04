import React from 'react';
import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';
import { fonts, useTheme } from '../../theme';

export type TxtVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodySmall'
  | 'caption'
  | 'label'
  | 'button'
  | 'num'
  | 'numSmall';

type Tone = 'default' | 'muted' | 'faint' | 'primary' | 'inverse' | 'danger' | 'success' | 'onPrimary';

const variants: Record<TxtVariant, TextStyle> = {
  display: { fontFamily: fonts.waheed, fontSize: 28, lineHeight: 46 },
  title: { fontFamily: fonts.waheed, fontSize: 22, lineHeight: 38 },
  heading: { fontFamily: fonts.waheed, fontSize: 18, lineHeight: 32 },
  subheading: { fontFamily: fonts.waheed, fontSize: 15, lineHeight: 27 },
  body: { fontFamily: fonts.faseyha, fontSize: 15, lineHeight: 28 },
  bodySmall: { fontFamily: fonts.faseyha, fontSize: 13.5, lineHeight: 24 },
  caption: { fontFamily: fonts.faseyha, fontSize: 12, lineHeight: 21 },
  label: { fontFamily: fonts.waheed, fontSize: 13, lineHeight: 23 },
  button: { fontFamily: fonts.waheed, fontSize: 16, lineHeight: 28 },
  num: { fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  numSmall: { fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
};

export type TxtProps = TextProps & {
  variant?: TxtVariant;
  tone?: Tone;
  color?: string;
  center?: boolean;
  /** Latin/number text that should keep LTR direction. */
  ltr?: boolean;
};

export function Txt({ variant = 'body', tone = 'default', color, center, ltr, style, ...rest }: TxtProps) {
  const t = useTheme();
  const toneColor = {
    default: t.text,
    muted: t.textMuted,
    faint: t.textFaint,
    primary: t.primary,
    inverse: t.scheme === 'dark' ? '#17141F' : '#FFFFFF',
    danger: t.danger,
    success: t.success,
    onPrimary: t.onPrimary,
  }[tone];

  return (
    <Text
      maxFontSizeMultiplier={1.4}
      {...rest}
      style={[
        styles.base,
        variants[variant],
        { color: color ?? toneColor, writingDirection: ltr ? 'ltr' : 'rtl' },
        center && styles.center,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  // Thaana glyphs overhang their advance width slightly; a hair of padding avoids clipping.
  base: { paddingHorizontal: 2 },
  center: { textAlign: 'center' },
});
