import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LibraryCard } from '@/src/components/book/LibraryCard';
import { BookActionsSheet } from '@/src/components/book/BookActionsSheet';
import { COVER_RATIO } from '@/src/components/book/BookCover';
import { EmptyState, OfflineBanner, Segmented, useIsOffline } from '@/src/components/ui/misc';
import { IconButton } from '@/src/components/ui/IconButton';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { Txt } from '@/src/components/ui/Txt';
import { useGrid } from '@/src/hooks/layout';
import { useMyBooks } from '@/src/hooks/queries';
import { useBottomSpace } from '@/src/hooks/useBottomSpace';
import { localThumbUri, useDownloadJobs, useDownloads } from '@/src/lib/downloads';
import { coverTag } from '@/src/lib/nav';
import { getReaderKey, openReader, readerTargetFromBook, type ReaderTarget } from '@/src/lib/reader';
import { formatBytes } from '@/src/lib/format';
import { useTheme } from '@/src/theme';

type Segment = 'paid' | 'free' | 'downloads';

type Item = {
  uuid: string;
  name: string;
  thumb: string;
  subtitle?: string | null;
  target: ReaderTarget | null;
};

export default function MyBooks() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const bottom = useBottomSpace(true);
  const offline = useIsOffline();
  const [segment, setSegment] = useState<Segment>(offline ? 'downloads' : 'paid');
  const [actions, setActions] = useState<ReaderTarget | null>(null);
  const { columns, itemWidth, gap, padding } = useGrid(130);
  const downloads = useDownloads();

  // Going offline: jump to the books that can actually be opened.
  const autoSwitched = useRef(false);
  useEffect(() => {
    if (offline && !autoSwitched.current && Object.keys(downloads).length) {
      autoSwitched.current = true;
      setSegment('downloads');
    }
  }, [offline, downloads]);

  const paid = useMyBooks('paid');
  const free = useMyBooks('free');
  const jobs = useDownloadJobs();

  const items: Item[] = useMemo(() => {
    if (segment === 'downloads') {
      return Object.values(downloads)
        .sort((a, b) => b.downloadedAt - a.downloadedAt)
        .map((r) => ({
          uuid: r.uuid,
          name: r.name_dv,
          thumb: r.hasLocalThumb ? localThumbUri(r.uuid) : r.thumb,
          subtitle: formatBytes(r.size),
          // Secret is fetched lazily from SecureStore on open.
          target: { ...r, idB64: '' },
        }));
    }
    const list = (segment === 'paid' ? paid.data : free.data) ?? [];
    return list.map((b) => ({
      uuid: b.uuid,
      name: b.name_dv,
      thumb: b.thumb,
      subtitle: b.author_name,
      target: readerTargetFromBook(b),
    }));
  }, [segment, downloads, paid.data, free.data]);

  const resolveTarget = useCallback(async (item: Item): Promise<ReaderTarget | null> => {
    if (!item.target) return null;
    if (item.target.idB64) return item.target;
    const key = await getReaderKey(item.uuid);
    return key ? { ...item.target, idB64: key } : null;
  }, []);

  const open = useCallback(
    async (item: Item) => {
      const target = await resolveTarget(item);
      if (target) openReader(target);
      else if (item.target) router.push({ pathname: '/books/[slug]', params: { slug: item.target.slug } });
    },
    [resolveTarget],
  );

  const longPress = useCallback(
    async (item: Item) => {
      const target = await resolveTarget(item);
      if (target) setActions(target);
    },
    [resolveTarget],
  );

  const query = segment === 'paid' ? paid : segment === 'free' ? free : null;
  const loading = !!query?.isLoading;
  const activeJobs = Object.keys(jobs).length;

  const counts = {
    paid: paid.data?.length,
    free: free.data?.length,
    downloads: Object.keys(downloads).length,
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + 8 }}>
      <View style={styles.top}>
        <View style={styles.titleRow}>
          <Txt variant="display" style={{ flex: 1 }}>
            މަގޭ ފޮތްތައް
          </Txt>
          <IconButton name="bookmarks-outline" variant="tonal" onPress={() => router.push('/bookmarks')} accessibilityLabel="ބުކްމާކްތައް" />
          <IconButton name="cloud-download-outline" variant="tonal" onPress={() => router.push('/downloads')} accessibilityLabel="ޑައުންލޯޑްތައް" />
        </View>
        <Segmented<Segment>
          value={segment}
          onChange={setSegment}
          options={[
            { value: 'paid', label: label('ގަނެފައި', counts.paid) },
            { value: 'free', label: label('ހިލޭ', counts.free) },
            { value: 'downloads', label: label('ޑައުންލޯޑް', counts.downloads), icon: activeJobs ? 'sync' : undefined },
          ]}
        />
      </View>
      <OfflineBanner />

      <FlatList
        key={`${segment}-${columns}`}
        data={items}
        numColumns={columns}
        keyExtractor={(i) => i.uuid}
        columnWrapperStyle={{ gap }}
        contentContainerStyle={{ paddingHorizontal: padding, paddingTop: 8, paddingBottom: bottom, gap: 20, flexGrow: 1 }}
        renderItem={({ item }) => (
          <Animated.View entering={FadeIn.duration(250)}>
            <LibraryCard
              uuid={item.uuid}
              name={item.name}
              thumb={item.thumb}
              subtitle={item.subtitle}
              width={itemWidth}
              tag={coverTag(`lib-${segment}`, item.uuid)}
              onPress={() => open(item)}
              onLongPress={() => longPress(item)}
            />
          </Animated.View>
        )}
        refreshControl={
          query ? <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={t.primary} /> : undefined
        }
        ListEmptyComponent={
          loading ? (
            <View style={[styles.skeletons, { gap }]}>
              {Array.from({ length: columns * 2 }).map((_, i) => (
                <Skeleton key={i} width={itemWidth} height={itemWidth / COVER_RATIO} radius={10} />
              ))}
            </View>
          ) : segment === 'downloads' ? (
            <EmptyState
              icon="cloud-download-outline"
              title="ޑައުންލޯޑްކޮށްފައިވާ ފޮތެއް ނެތް"
              message="ގަނެފައިވާ ނުވަތަ ހިލޭ ފޮތްތައް ޑައުންލޯޑްކޮށްގެން އިންޓަނެޓް ނެތިއްޔާވެސް ކިޔޭނެ. ފޮތެއްގެ މައްޗަށް ދިގުކޮށް ފިއްތާލާ."
            />
          ) : (
            <EmptyState
              icon="book-outline"
              title="މިވަގުތު އެއްވެސް ފޮތެއް ނެތް"
              message={segment === 'paid' ? 'ގަންނަވާ ފޮތްތައް މިތަނުގައި ފެންނާނެ' : 'ކިޔާލި ހިލޭ ފޮތްތައް މިތަނުގައި ފެންނާނެ'}
              actionLabel="ފޮތްތައް ބައްލަވާ"
              onAction={() => router.navigate('/home')}
            />
          )
        }
      />

      <BookActionsSheet target={actions} onClose={() => setActions(null)} />
    </View>
  );
}

const label = (text: string, count?: number) => (count ? `${text} (${count})` : text);

const styles = StyleSheet.create({
  top: { paddingHorizontal: 16, gap: 10, paddingBottom: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  skeletons: { flexDirection: 'row', flexWrap: 'wrap' },
});
