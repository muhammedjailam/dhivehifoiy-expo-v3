import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View, type ListRenderItem } from 'react-native';
import Animated, { useAnimatedScrollHandler, type SharedValue } from 'react-native-reanimated';
import { BookCard } from './BookCard';
import { COVER_RATIO } from './BookCover';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/misc';
import { useGrid } from '../../hooks/layout';
import { useBookList } from '../../hooks/queries';
import { errorMessage } from '../../lib/api';
import { useTheme } from '../../theme';
import type { Book } from '../../types';

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<Book>);

type Props = {
  queryKey: unknown[];
  endpoint: string;
  params?: Record<string, any>;
  filters?: Record<string, any>;
  scope: string;
  header?: React.ReactElement | null;
  emptyTitle?: string;
  scrollY?: SharedValue<number>;
  bottomInset?: number;
  enabled?: boolean;
};

/** Infinite, responsive cover grid used by genre / collection / author / "see all" / search. */
export function BookGrid({
  queryKey,
  endpoint,
  params,
  filters,
  scope,
  header,
  emptyTitle = 'މިވަގުތު އެއްވެސް ފޮތެއް ނެތް',
  scrollY,
  bottomInset = 32,
  enabled = true,
}: Props) {
  const t = useTheme();
  const { columns, itemWidth, gap, padding } = useGrid(140);
  const query = useBookList(queryKey, { endpoint, params, filters }, enabled);

  const books = useMemo(() => {
    const seen = new Set<string>();
    const out: Book[] = [];
    query.data?.pages.forEach((p) =>
      p?.data?.forEach((b) => {
        const k = b.uuid ?? b.slug;
        if (!seen.has(k)) {
          seen.add(k);
          out.push(b);
        }
      }),
    );
    return out;
  }, [query.data]);

  const onScroll = useAnimatedScrollHandler((e) => {
    if (scrollY) scrollY.value = e.contentOffset.y;
  });

  const renderItem: ListRenderItem<Book> = useCallback(
    ({ item }) => <BookCard book={item} width={itemWidth} scope={scope} />,
    [itemWidth, scope],
  );

  const loadMore = () => {
    if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
  };

  return (
    <AnimatedFlatList
      key={`grid-${columns}`}
      data={books}
      numColumns={columns}
      renderItem={renderItem}
      keyExtractor={(b: Book) => b.uuid ?? b.slug}
      onScroll={onScroll}
      scrollEventThrottle={16}
      columnWrapperStyle={{ gap }}
      contentContainerStyle={{ paddingHorizontal: padding, paddingBottom: bottomInset, gap: 20 }}
      ListHeaderComponent={header}
      onEndReached={loadMore}
      onEndReachedThreshold={0.6}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => query.refetch()} tintColor={t.primary} />
      }
      ListEmptyComponent={
        query.isLoading ? (
          <View style={[styles.skeletonGrid, { gap }]}>
            {Array.from({ length: columns * 2 }).map((_, i) => (
              <View key={i} style={{ width: itemWidth, gap: 8 }}>
                <Skeleton width={itemWidth} height={itemWidth / COVER_RATIO} radius={10} />
                <Skeleton width={itemWidth * 0.7} height={10} />
              </View>
            ))}
          </View>
        ) : query.isError ? (
          <EmptyState icon="cloud-offline-outline" title={errorMessage(query.error)} actionLabel="އަލުން" onAction={() => query.refetch()} />
        ) : (
          <EmptyState title={emptyTitle} />
        )
      }
      ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator color={t.primary} style={{ margin: 16 }} /> : null}
      removeClippedSubviews
      windowSize={7}
    />
  );
}

const styles = StyleSheet.create({
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingTop: 8 },
});
