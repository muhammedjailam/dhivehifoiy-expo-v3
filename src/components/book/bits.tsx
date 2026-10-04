import React from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { Txt } from '../ui/Txt';
import { Chip } from '../ui/misc';
import { priceOf } from '../../lib/format';
import { useTheme } from '../../theme';
import type { Book, Genre } from '../../types';

const classificationImages: Record<string, number> = {
  parental_guidance: require('../../../assets/images/parental_guidance.png'),
  parental_guidence: require('../../../assets/images/parental_guidance.png'),
  general: require('../../../assets/images/general.png'),
  twelve_plus: require('../../../assets/images/twelve_plus.png'),
  fifteen_plus: require('../../../assets/images/fifteen_plus.png'),
  eighteen_plus: require('../../../assets/images/eighteen_plus.png'),
  eighteen_plus_restricted: require('../../../assets/images/eighteen_plus_restricted.png'),
};

export function ClassificationBadge({ value, size = 28, style }: { value?: string | null; size?: number; style?: StyleProp<any> }) {
  if (!value || !classificationImages[value]) return null;
  return <Image source={classificationImages[value]} resizeMode="contain" style={[{ width: size, height: size }, style]} />;
}

export function PriceTag({ price, size = 'md', color }: { price?: string | number | null; size?: 'sm' | 'md' | 'lg'; color?: string }) {
  const t = useTheme();
  const value = priceOf(price);
  const fg = color ?? t.text;
  const fontSize = size === 'lg' ? 20 : size === 'sm' ? 12 : 15;
  return (
    <View style={styles.price}>
      <Image
        source={require('../../../assets/images/mvr.png')}
        tintColor={fg}
        resizeMode="contain"
        style={{ width: fontSize * 0.95, height: fontSize * 0.6 }}
      />
      <Txt variant="num" ltr color={fg} style={{ fontSize }}>
        {value}
      </Txt>
    </View>
  );
}

export function GenreChip({ genre, style }: { genre: Genre; style?: StyleProp<ViewStyle> }) {
  return (
    <Chip
      label={genre.name_dv}
      style={style}
      onPress={() => router.push({ pathname: '/genre/[slug]', params: { slug: genre.slug, genre_name: genre.name_dv } })}
    />
  );
}

/** Small "free" / price pill drawn over covers. */
export function CoverBadge({ book }: { book: Pick<Book, 'price'> }) {
  const t = useTheme();
  const free = priceOf(book.price) === 0;
  return (
    <View style={[styles.badge, { backgroundColor: free ? t.success : 'rgba(20,16,28,0.78)' }]}>
      {free ? (
        <Txt variant="caption" color="#fff" style={{ fontSize: 11, lineHeight: 18 }}>
          ހިލޭ
        </Txt>
      ) : (
        <PriceTag price={book.price} size="sm" color="#fff" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  price: { flexDirection: 'row', alignItems: 'center', gap: 3, direction: 'ltr' },
  badge: {
    position: 'absolute',
    bottom: 6,
    start: 6,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 8,
  },
});
