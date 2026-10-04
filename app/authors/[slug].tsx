import React, { useState } from 'react';
import { Linking, Share, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import Animated, { FadeIn, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookGrid } from '@/src/components/book/BookGrid';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { IconButton, type IconName } from '@/src/components/ui/IconButton';
import { PressableScale } from '@/src/components/ui/PressableScale';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { Txt } from '@/src/components/ui/Txt';
import { useAuthor } from '@/src/hooks/queries';
import { radius, useTheme } from '@/src/theme';
import type { Author } from '@/src/types';

const SOCIALS: { key: string; icon: IconName }[] = [
  { key: 'facebook', icon: 'logo-facebook' },
  { key: 'instagram', icon: 'logo-instagram' },
  { key: 'linkedin', icon: 'logo-linkedin' },
  { key: 'tiktok', icon: 'logo-tiktok' },
  { key: 'twitter', icon: 'logo-twitter' },
  { key: 'youtube', icon: 'logo-youtube' },
  { key: 'website', icon: 'globe-outline' },
];

/** The API returns social keys wrapped in quotes (e.g. "'facebook'"); accept both shapes. */
function social(author: Author, key: string) {
  return author.socials?.[`'${key}'`] || author.socials?.[key] || null;
}

export default function AuthorScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { slug, name } = useLocalSearchParams<{ slug: string; name?: string }>();
  const author = useAuthor(slug);
  const scrollY = useSharedValue(0);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader title={author.data?.name ?? name} scrollY={scrollY} collapsedTitle />
      <BookGrid
        queryKey={['author', slug]}
        endpoint="/books"
        filters={{ forAuthor: slug }}
        scope={`author-${slug}`}
        scrollY={scrollY}
        bottomInset={insets.bottom + 24}
        header={<AuthorHeader author={author.data} fallbackName={name} />}
      />
    </View>
  );
}

function AuthorHeader({ author, fallbackName }: { author?: Author; fallbackName?: string }) {
  const t = useTheme();
  const [expanded, setExpanded] = useState(false);

  const share = async () => {
    if (!author) return;
    await Share.share({
      message: `${author.name_en ?? author.name} on Dhivehi Foiy App: ${author.preview_link ?? ''}`,
      url: author.preview_link ?? '',
      title: author.name,
    });
  };

  return (
    <Animated.View entering={FadeIn} style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
      {author?.avatar ? (
        <Image source={{ uri: author.avatar }} style={styles.avatar} contentFit="cover" transition={200} />
      ) : (
        <Skeleton width={104} height={104} radius={52} />
      )}
      <Txt variant="title" center>
        {author?.name ?? fallbackName}
      </Txt>
      {!!author?.bio && (
        <PressableScale scaleTo={0.99} onPress={() => setExpanded((v) => !v)}>
          <Txt variant="bodySmall" tone="muted" center numberOfLines={expanded ? undefined : 3}>
            {author.bio}
          </Txt>
        </PressableScale>
      )}
      {author && (
        <View style={styles.socials}>
          <IconButton name="share-social-outline" size={18} variant="tonal" onPress={share} accessibilityLabel="ޝެއާ" />
          {SOCIALS.map(({ key, icon }) => {
            const url = social(author, key);
            return url ? (
              <IconButton key={key} name={icon} size={18} variant="tonal" onPress={() => Linking.openURL(url)} accessibilityLabel={key} />
            ) : null;
          })}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: 6,
    padding: 18,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
    marginBottom: 8,
  },
  avatar: { width: 104, height: 104, borderRadius: 52, marginBottom: 6 },
  socials: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' },
});
