import React, { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookGrid } from '@/src/components/book/BookGrid';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { useTheme } from '@/src/theme';

/** "See all" list – same randomized + seeded endpoint as v2 so pagination stays stable. */
export default function BooksIndex() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { sort, title, ...filters } = useLocalSearchParams<Record<string, string>>();
  const [seed] = useState(() => Math.floor(Math.random() * 90000) + 1);
  const scrollY = useSharedValue(0);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader title={title || 'ފޮތްތައް'} scrollY={scrollY} />
      <BookGrid
        queryKey={['all', sort, JSON.stringify(filters), seed]}
        endpoint="/books/randomize"
        params={{ sort: sort || '-published_at', seed }}
        filters={filters}
        scope="all"
        scrollY={scrollY}
        bottomInset={insets.bottom + 24}
      />
    </View>
  );
}
