import React, { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BookCover } from './BookCover';
import { CoverBadge, ClassificationBadge, PriceTag } from './bits';
import { PressableScale } from '../ui/PressableScale';
import { Txt } from '../ui/Txt';
import { ProgressBar } from '../ui/misc';
import { coverTag, openBookDetail } from '../../lib/nav';
import { isFree } from '../../lib/format';
import { radius, useShadow, useTheme } from '../../theme';
import type { Book } from '../../types';

type CardProps = {
  book: Book;
  width: number;
  scope: string;
  showPrice?: boolean;
  showAuthor?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  progress?: number;
  downloaded?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Cover + title card used in shelves and grids. */
export const BookCard = memo(function BookCard({
  book,
  width,
  scope,
  showPrice = true,
  showAuthor = true,
  onPress,
  onLongPress,
  progress,
  downloaded,
  style,
}: CardProps) {
  const t = useTheme();
  const tag = coverTag(scope, book.uuid ?? book.slug);
  return (
    <PressableScale
      onPress={onPress ?? (() => openBookDetail(book, tag))}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={[{ width }, style]}
      accessibilityLabel={book.name_dv}
    >
      <BookCover uri={book.thumb} width={width} tag={tag}>
        {showPrice && <CoverBadge book={book} />}
        {downloaded && (
          <View style={[styles.downloaded, { backgroundColor: t.success }]}>
            <Ionicons name="arrow-down" size={12} color="#fff" />
          </View>
        )}
      </BookCover>
      {progress !== undefined && progress > 0 && <ProgressBar value={progress} height={3} style={{ marginTop: 8 }} />}
      <Txt variant="label" numberOfLines={1} style={{ marginTop: 6 }}>
        {book.name_dv}
      </Txt>
      {showAuthor && !!(book.author_name || book.collection_name) && (
        <Txt variant="caption" tone="muted" numberOfLines={1} style={{ marginTop: -2 }}>
          {book.collection_name || book.author_name}
        </Txt>
      )}
    </PressableScale>
  );
});

/** Wide card with cover + excerpt, used for the "for sale" shelf and search results. */
export const BookCardWide = memo(function BookCardWide({
  book,
  width,
  scope,
  style,
}: {
  book: Book;
  width: number;
  scope: string;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const shadow = useShadow(1);
  const tag = coverTag(scope, book.uuid ?? book.slug);
  const coverWidth = Math.min(108, width * 0.36);
  return (
    <PressableScale
      onPress={() => openBookDetail(book, tag)}
      style={[styles.wide, { width, backgroundColor: t.surface, borderColor: t.border }, shadow, style]}
      accessibilityLabel={book.name_dv}
    >
      <BookCover uri={book.thumb} width={coverWidth} tag={tag} shadow={1} />
      <View style={styles.wideBody}>
        <Txt variant="subheading" numberOfLines={2}>
          {book.name_dv}
        </Txt>
        {!!(book.collection_name || book.author_name) && (
          <Txt variant="caption" tone="primary" numberOfLines={1}>
            {book.collection_name || book.author_name}
          </Txt>
        )}
        {!!book.excerpt_dv && (
          <Txt variant="caption" tone="muted" numberOfLines={3} style={{ marginTop: 2 }}>
            {book.excerpt_dv}
          </Txt>
        )}
        <View style={styles.wideFooter}>
          {isFree(book.price) ? (
            <Txt variant="label" tone="success">
              ހިލޭ
            </Txt>
          ) : (
            <PriceTag price={book.price} color={t.primary} />
          )}
          <View style={styles.wideIcons}>
            {book.has_audio && <Ionicons name="headset-outline" size={16} color={t.textMuted} />}
            <ClassificationBadge value={book.classification} size={22} />
          </View>
        </View>
      </View>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  downloaded: {
    position: 'absolute',
    top: 6,
    end: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wide: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  wideBody: { flex: 1, justifyContent: 'flex-start' },
  wideFooter: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 },
  wideIcons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
