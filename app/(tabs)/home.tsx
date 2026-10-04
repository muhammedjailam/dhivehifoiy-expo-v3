import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Image, RefreshControl, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { BlurView } from 'expo-blur';
import Animated, { interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { HeroCarousel } from '@/src/components/book/HeroCarousel';
import { Shelf } from '@/src/components/book/Shelf';
import { BookCard, BookCardWide } from '@/src/components/book/BookCard';
import { AuthorBubble, MagazineCard } from '@/src/components/book/People';
import { ContinueCard } from '@/src/components/book/ContinueCard';
import { GenreChip } from '@/src/components/book/bits';
import { IconButton } from '@/src/components/ui/IconButton';
import { OfflineBanner } from '@/src/components/ui/misc';
import { Txt } from '@/src/components/ui/Txt';
import { useAuthors, useBookRail, useGenres, useMagazines, useProfile, useSlides } from '@/src/hooks/queries';
import { useBottomSpace } from '@/src/hooks/useBottomSpace';
import { removeFromHistory, useHistory, useLibraryBooks, useProgressMap } from '@/src/lib/library';
import { useDownloads } from '@/src/lib/downloads';
import { useTheme } from '@/src/theme';

const HEADER_HEIGHT = 56;

export default function Home() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const bottom = useBottomSpace(true);
  const queryClient = useQueryClient();
  const scrollY = useSharedValue(0);
  const [refreshing, setRefreshing] = useState(false);

  const slides = useSlides();
  const popular = useBookRail('popular', { sort: '-purchases_count' }, {}, false);
  const paid = useBookRail('paid', {}, { paid: true, randomize: true });
  const audio = useBookRail('audio', {}, { hasAudio: true, randomize: true });
  const free = useBookRail('free', {}, { free: true, randomize: true });
  const magazines = useMagazines();
  const genres = useGenres();
  const authors = useAuthors();
  const profile = useProfile();

  const history = useHistory();
  const books = useLibraryBooks();
  const progress = useProgressMap();
  const downloads = useDownloads();
  const continueReading = useMemo(() => history.map((u) => books[u]).filter(Boolean).slice(0, 12), [history, books]);

  const cardWidth = width > 600 ? 132 : 112;
  const wideWidth = Math.min(width * 0.82, 360);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  }, [queryClient]);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const headerBg = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.value, [0, 60], [0, 1], 'clamp') }));

  const firstName = (profile.data?.name_dv ?? '').split(' ')[0];

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: insets.top + HEADER_HEIGHT, paddingBottom: bottom }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.primary} progressViewOffset={insets.top + HEADER_HEIGHT} />}
        showsVerticalScrollIndicator={false}
      >
        <OfflineBanner />
        <View style={styles.greeting}>
          <Txt variant="title">{firstName ? `ސަލާމް، ${firstName}` : 'ސަލާމް'}</Txt>
          <Txt variant="bodySmall" tone="muted" style={{ marginTop: -4 }}>
            މިއަދު ކިޔާލަން ބޭނުންވަނީ ކޮން ފޮތެއް؟
          </Txt>
        </View>

        <HeroCarousel slides={slides.data} loading={slides.isLoading} />

        {continueReading.length > 0 && (
          <Shelf
            title="ކިޔަމުން ދިޔަ ފޮތްތައް"
            data={continueReading}
            keyExtractor={(m) => m.uuid}
            renderItem={({ item }) => (
              <ContinueCard
                meta={item}
                progress={progress[item.uuid]}
                width={cardWidth}
                downloaded={!!downloads[item.uuid]}
                onLongPress={() =>
                  Alert.alert(item.name_dv, 'މި ލިސްޓުން ނަގާލަންތަ؟', [
                    { text: 'ނޫން', style: 'cancel' },
                    { text: 'ނަގާލާ', style: 'destructive', onPress: () => removeFromHistory(item.uuid) },
                  ])
                }
              />
            )}
          />
        )}

        <Shelf
          title="މަޤްބޫލު ފޮތްތައް"
          data={popular.data}
          loading={popular.isLoading}
          itemWidth={cardWidth}
          keyExtractor={(b) => b.uuid}
          onMore={() => router.push({ pathname: '/books', params: { sort: '-purchases_count', title: 'މަޤްބޫލު ފޮތްތައް' } })}
          renderItem={({ item }) => <BookCard book={item} width={cardWidth} scope="popular" />}
        />

        <Shelf
          title="ވިއްކާ ފޮތްތައް"
          data={paid.data}
          loading={paid.isLoading}
          itemWidth={wideWidth}
          skeletonShape="wide"
          keyExtractor={(b) => b.uuid}
          onMore={() => router.push({ pathname: '/books', params: { paid: '1', title: 'ވިއްކާ ފޮތްތައް' } })}
          renderItem={({ item }) => <BookCardWide book={item} width={wideWidth} scope="paid" />}
        />

        <Shelf
          title="އޯޑިއޯއާއެކު ލިބެން ހުރި ފޮތްތައް"
          data={audio.data}
          loading={audio.isLoading}
          itemWidth={cardWidth}
          keyExtractor={(b) => b.uuid}
          onMore={() => router.push({ pathname: '/books', params: { hasAudio: '1', title: 'އޯޑިއޯ ފޮތްތައް' } })}
          renderItem={({ item }) => <BookCard book={item} width={cardWidth} scope="audio" />}
        />

        <Shelf
          title="ލިޔުންތެރިން"
          data={authors.data}
          loading={authors.isLoading}
          skeletonShape="circle"
          gap={10}
          keyExtractor={(a) => String(a.id)}
          renderItem={({ item }) => <AuthorBubble author={item} />}
        />

        <Shelf
          title="މަޖައްލާތައް"
          data={magazines.data}
          loading={magazines.isLoading}
          itemWidth={cardWidth}
          keyExtractor={(m) => String(m.id)}
          renderItem={({ item }) => <MagazineCard magazine={item} width={cardWidth} />}
        />

        <Shelf
          title="ކެޓަގަރީތައް"
          data={genres.data}
          loading={genres.isLoading}
          skeletonShape="chip"
          gap={8}
          keyExtractor={(g) => String(g.id)}
          renderItem={({ item }) => <GenreChip genre={item} />}
        />

        <Shelf
          title="ހިލޭ ލިބެން ހުރި ފޮތްތައް"
          data={free.data}
          loading={free.isLoading}
          itemWidth={cardWidth}
          keyExtractor={(b) => b.uuid}
          onMore={() => router.push({ pathname: '/books', params: { free: '1', title: 'ހިލޭ ފޮތްތައް' } })}
          renderItem={({ item }) => <BookCard book={item} width={cardWidth} scope="free" />}
        />
      </Animated.ScrollView>

      {/* Sticky glass header */}
      <View style={[styles.header, { paddingTop: insets.top, height: insets.top + HEADER_HEIGHT }]} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFill, headerBg]}>
          <BlurView intensity={60} tint={t.scheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: t.tabBar, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: t.border }]} />
        </Animated.View>
        <View style={styles.headerRow}>
          <Image
            source={require('../../assets/images/logo.png')}
            resizeMode="contain"
            style={styles.logo}
            tintColor={t.scheme === 'dark' ? '#fff' : undefined}
          />
          <IconButton name="search" variant="tonal" onPress={() => router.navigate('/search')} accessibilityLabel="ހޯދާ" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { position: 'absolute', top: 0, left: 0, right: 0 },
  headerRow: { height: HEADER_HEIGHT, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  logo: { width: 84, height: 44 },
  greeting: { paddingHorizontal: 16, paddingBottom: 6 },
});
