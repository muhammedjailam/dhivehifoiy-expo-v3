import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookGrid } from '@/src/components/book/BookGrid';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { useTheme } from '@/src/theme';

export default function GenreScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { slug, genre_name } = useLocalSearchParams<{ slug: string; genre_name?: string }>();
  const scrollY = useSharedValue(0);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader title={genre_name || 'ކެޓަގަރީ'} scrollY={scrollY} />
      <BookGrid
        queryKey={['genre', slug]}
        endpoint="/books"
        filters={{ forGenre: slug }}
        scope={`genre-${slug}`}
        scrollY={scrollY}
        bottomInset={insets.bottom + 24}
      />
    </View>
  );
}
