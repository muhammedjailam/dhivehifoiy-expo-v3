import React from 'react';
import { FlatList, StyleSheet, View, type ListRenderItem } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SectionHeading } from '../ui/misc';
import { Skeleton } from '../ui/Skeleton';
import { COVER_RATIO } from './BookCover';

type ShelfProps<T> = {
  title: string;
  data?: T[];
  loading?: boolean;
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T, index: number) => string;
  onMore?: () => void;
  moreLabel?: string;
  /** used for the skeleton */
  itemWidth?: number;
  skeletonShape?: 'cover' | 'circle' | 'wide' | 'chip';
  gap?: number;
  tinted?: boolean;
};

/** Titled horizontal rail. Naturally starts from the right in RTL. */
export function Shelf<T>({
  title,
  data,
  loading,
  renderItem,
  keyExtractor,
  onMore,
  moreLabel,
  itemWidth = 118,
  skeletonShape = 'cover',
  gap = 14,
}: ShelfProps<T>) {
  if (!loading && (!data || data.length === 0)) return null;

  return (
    <View style={styles.wrap}>
      <SectionHeading title={title} onAction={onMore} actionLabel={moreLabel} />
      {loading && !data?.length ? (
        <View style={[styles.skeletonRow, { gap }]}>
          {Array.from({ length: 4 }).map((_, i) => (
            <ShelfSkeleton key={i} shape={skeletonShape} width={itemWidth} />
          ))}
        </View>
      ) : (
        <Animated.View entering={FadeIn.duration(350)}>
          <FlatList
            horizontal
            data={data}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap }}
            initialNumToRender={5}
            windowSize={5}
          />
        </Animated.View>
      )}
    </View>
  );
}

function ShelfSkeleton({ shape, width }: { shape: ShelfProps<unknown>['skeletonShape']; width: number }) {
  if (shape === 'circle') {
    return (
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Skeleton width={64} height={64} radius={32} />
        <Skeleton width={52} height={10} />
      </View>
    );
  }
  if (shape === 'chip') return <Skeleton width={84} height={36} radius={18} />;
  if (shape === 'wide') return <Skeleton width={width} height={170} radius={18} />;
  return (
    <View style={{ gap: 8 }}>
      <Skeleton width={width} height={width / COVER_RATIO} radius={10} />
      <Skeleton width={width * 0.8} height={10} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 22 },
  skeletonRow: { flexDirection: 'row', paddingHorizontal: 16, overflow: 'hidden' },
});
