import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { EmptyState } from '@/src/components/ui/misc';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { Txt, type TxtVariant } from '@/src/components/ui/Txt';
import { usePage } from '@/src/hooks/queries';
import { errorMessage } from '@/src/lib/api';
import { plainText } from '@/src/lib/format';
import { useTheme } from '@/src/theme';

const headingVariant = (level?: number): TxtVariant => (level && level <= 2 ? 'title' : level === 3 ? 'heading' : 'subheading');

export default function CmsPageScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { slug, title } = useLocalSearchParams<{ slug: string; title?: string }>();
  const page = usePage(slug);
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader title={page.data?.title ?? title} scrollY={scrollY} />
      {page.isLoading ? (
        <View style={{ padding: 20, gap: 12 }}>
          <Skeleton height={26} width="60%" />
          <Skeleton height={14} />
          <Skeleton height={14} />
          <Skeleton height={14} width="80%" />
        </View>
      ) : page.isError ? (
        <EmptyState icon="cloud-offline-outline" title={errorMessage(page.error)} actionLabel="އަލުން" onAction={() => page.refetch()} />
      ) : (
        <Animated.ScrollView
          entering={FadeIn}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 10 }}
        >
          {page.data?.content_blocks?.map((block, index) => {
            const text = plainText(block.data?.text);
            switch (block.type) {
              case 'header':
                return (
                  <Txt key={index} variant={headingVariant(block.data?.level)} style={styles.heading}>
                    {text}
                  </Txt>
                );
              case 'paragraph':
                return (
                  <Txt key={index} variant="body">
                    {text}
                  </Txt>
                );
              case 'list':
                return (
                  <View key={index} style={{ gap: 4 }}>
                    {(block.data?.items ?? []).map((item: any, i: number) => (
                      <Txt key={i} variant="body">
                        {`${block.data?.style === 'ordered' ? `${i + 1}.` : '•'} ${plainText(typeof item === 'string' ? item : item?.content)}`}
                      </Txt>
                    ))}
                  </View>
                );
              case 'quote':
                return (
                  <View key={index} style={[styles.quote, { borderColor: t.primary, backgroundColor: t.primarySoft }]}>
                    <Txt variant="body">{text}</Txt>
                  </View>
                );
              default:
                return text ? (
                  <Txt key={index} variant="body">
                    {text}
                  </Txt>
                ) : null;
            }
          })}
        </Animated.ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { marginTop: 8 },
  quote: { borderStartWidth: 3, padding: 12, borderRadius: 8 },
});
