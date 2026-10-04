import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { PressableScale } from '../ui/PressableScale';
import { Txt } from '../ui/Txt';
import { BookCover } from './BookCover';
import { useTheme } from '../../theme';
import type { Author, Magazine } from '../../types';

export const AuthorBubble = memo(function AuthorBubble({ author }: { author: Author }) {
  const t = useTheme();
  return (
    <PressableScale
      onPress={() => router.push({ pathname: '/authors/[slug]', params: { slug: author.slug, name: author.name } })}
      style={styles.author}
      accessibilityLabel={author.name}
    >
      <View style={[styles.avatarRing, { borderColor: t.primarySoft }]}>
        <Image source={{ uri: author.avatar }} style={styles.avatar} contentFit="cover" transition={200} />
      </View>
      <Txt variant="caption" numberOfLines={1} center style={{ width: 76 }}>
        {author.name}
      </Txt>
    </PressableScale>
  );
});

export const MagazineCard = memo(function MagazineCard({ magazine, width }: { magazine: Magazine; width: number }) {
  const cover = magazine.books?.[0]?.thumb;
  return (
    <PressableScale
      onPress={() => router.push({ pathname: '/collections/[slug]', params: { slug: magazine.slug, name: magazine.name_dv } })}
      style={{ width }}
      accessibilityLabel={magazine.name_dv}
    >
      <View>
        {magazine.books?.length > 1 && (
          <BookCover uri={magazine.books[1]?.thumb} width={width} shadow={0} style={styles.stacked} />
        )}
        <BookCover uri={cover} width={width} />
      </View>
      <Txt variant="label" numberOfLines={1} style={{ marginTop: 6 }}>
        {magazine.name_dv}
      </Txt>
      <Txt variant="caption" tone="muted" style={{ marginTop: -2 }}>
        {`${magazine.books?.length ?? 0} އަދަދު`}
      </Txt>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  author: { alignItems: 'center', gap: 6, width: 76 },
  avatarRing: { borderWidth: 2, borderRadius: 36, padding: 2 },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  stacked: { position: 'absolute', top: -5, start: 6, opacity: 0.5, transform: [{ rotate: '4deg' }] },
});
