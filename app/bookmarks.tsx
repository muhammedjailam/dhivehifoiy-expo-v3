import React, { useMemo } from 'react';
import { Alert, SectionList, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BookCover } from '@/src/components/book/BookCover';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { EmptyState } from '@/src/components/ui/misc';
import { PressableScale } from '@/src/components/ui/PressableScale';
import { Txt } from '@/src/components/ui/Txt';
import { removeBookmark, useAllBookmarks, useLibraryBooks, type Bookmark, type BookMeta } from '@/src/lib/library';
import { getReaderKey, openReader } from '@/src/lib/reader';
import { libraryStore } from '@/src/lib/library';
import { relativeDay } from '@/src/lib/format';
import { radius, useTheme } from '@/src/theme';

const AnimatedSectionList = Animated.createAnimatedComponent(SectionList<Bookmark, { meta: BookMeta; data: Bookmark[] }>);

/** Opens the reader directly at a bookmarked page. */
async function openAt(meta: BookMeta, page: number) {
  const idB64 = await getReaderKey(meta.uuid);
  if (!idB64) return;
  // The reader resumes from saved progress, so point progress at the bookmark first.
  const prev = libraryStore.get().progress[meta.uuid];
  libraryStore.set((s) => ({
    ...s,
    progress: { ...s.progress, [meta.uuid]: { page, total: prev?.total ?? page, updatedAt: Date.now() } },
  }));
  openReader({ ...meta, idB64 });
}

export default function Bookmarks() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { uuid } = useLocalSearchParams<{ uuid?: string }>();
  const all = useAllBookmarks();
  const books = useLibraryBooks();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const sections = useMemo(
    () =>
      Object.entries(all)
        .filter(([u, list]) => list.length && books[u] && (!uuid || u === uuid))
        .map(([u, list]) => ({ meta: books[u], data: list }))
        .sort((a, b) => Math.max(...b.data.map((x) => x.createdAt)) - Math.max(...a.data.map((x) => x.createdAt))),
    [all, books, uuid],
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader title="ބުކްމާކްތައް" scrollY={scrollY} />
      <AnimatedSectionList
        sections={sections}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyExtractor={(b: Bookmark) => b.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, flexGrow: 1 }}
        renderSectionHeader={({ section }: any) => (
          <View style={styles.sectionHead}>
            <BookCover uri={section.meta.thumb} width={40} radius={5} shadow={1} />
            <View style={{ flex: 1 }}>
              <Txt variant="heading" numberOfLines={1}>
                {section.meta.name_dv}
              </Txt>
              <Txt variant="caption" tone="muted">{`${section.data.length} ބުކްމާކް`}</Txt>
            </View>
          </View>
        )}
        renderItem={({ item, section }: any) => (
          <PressableScale
            scaleTo={0.98}
            onPress={() => openAt(section.meta, item.page)}
            onLongPress={() =>
              Alert.alert('ބުކްމާކް ފޮހެލަންތަ؟', undefined, [
                { text: 'ނޫން', style: 'cancel' },
                { text: 'ފޮހެލާ', style: 'destructive', onPress: () => removeBookmark(section.meta.uuid, item.id) },
              ])
            }
            style={[styles.row, { backgroundColor: t.surface, borderColor: t.border }]}
          >
            <View style={[styles.page, { backgroundColor: t.primarySoft }]}>
              <Txt variant="numSmall" ltr tone="primary">
                {item.page}
              </Txt>
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="subheading" numberOfLines={2}>
                {item.note || `ސަފްޙާ ${item.page}`}
              </Txt>
              <Txt variant="caption" tone="muted">
                {relativeDay(item.createdAt)}
              </Txt>
            </View>
            <Ionicons name="bookmark" size={18} color={t.accent} />
          </PressableScale>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="bookmark-outline"
            title="އަދި ބުކްމާކެއް ނެތް"
            message="ފޮތެއް ކިޔާއިރު މަތީގައިވާ ބުކްމާކް ބަޓަނަށް ފިއްތާލުމުން އެ ސަފްޙާ މިތަނަށް ރައްކާވާނެ."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, marginBottom: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  page: { minWidth: 46, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
});
