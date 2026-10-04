import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookGrid } from '@/src/components/book/BookGrid';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { useTheme } from '@/src/theme';

export default function CollectionScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { slug, name } = useLocalSearchParams<{ slug: string; name?: string }>();
  const scrollY = useSharedValue(0);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader title={name || 'މަޖައްލާ'} scrollY={scrollY} />
      <BookGrid
        queryKey={['collection', slug]}
        endpoint="/books"
        filters={{ forCollection: slug }}
        scope={`col-${slug}`}
        scrollY={scrollY}
        bottomInset={insets.bottom + 24}
      />
    </View>
  );
}
