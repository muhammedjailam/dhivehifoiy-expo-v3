import React, { useCallback, useRef, useState } from 'react';
import { Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BookCover } from '@/src/components/book/BookCover';
import { ClassificationBadge, GenreChip, PriceTag } from '@/src/components/book/bits';
import { DownloadButton } from '@/src/components/book/DownloadButton';
import { BackButton } from '@/src/components/ui/ScreenHeader';
import { Button } from '@/src/components/ui/Button';
import { IconButton } from '@/src/components/ui/IconButton';
import { PressableScale } from '@/src/components/ui/PressableScale';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { EmptyState, ProgressBar } from '@/src/components/ui/misc';
import { Txt } from '@/src/components/ui/Txt';
import { useBook } from '@/src/hooks/queries';
import { api, errorMessage } from '@/src/lib/api';
import { isFree, yearOf } from '@/src/lib/format';
import { useProgress } from '@/src/lib/library';
import { openReader, readerTargetFromBook } from '@/src/lib/reader';
import { radius, useShadow, useTheme } from '@/src/theme';
import type { Book } from '@/src/types';

type Params = { slug: string; tag?: string; thumb?: string; name_dv?: string; author?: string };

export default function BookDetail() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<Params>();
  const query = useBook(params.slug);
  const book = query.data;
  const scrollY = useSharedValue(0);
  const firstFocus = useRef(true);

  // Returning from the payment screen: refresh ownership.
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) firstFocus.current = false;
      else query.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const cover = book?.thumb ?? params.thumb;
  const title = book?.name_dv ?? params.name_dv;
  const subtitle = book ? book.collection_name || book.author_name : params.author;
  const coverWidth = Math.min(width * 0.46, 210);
  const heroHeight = insets.top + 64 + coverWidth / 0.7 + 24;

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const heroBg = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, [-200, 0, 300], [-100, 0, 120], 'clamp') },
      { scale: interpolate(scrollY.value, [-200, 0], [1.5, 1], 'clamp') },
    ],
  }));
  const coverParallax = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scrollY.value, [0, 300], [0, 60], 'clamp') }],
    opacity: interpolate(scrollY.value, [0, 260], [1, 0.4], 'clamp'),
  }));
  const barStyle = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.value, [heroHeight - 160, heroHeight - 80], [0, 1], 'clamp') }));

  const share = async () => {
    if (!book) return;
    await Share.share({ message: book.preview_link, url: book.preview_link, title: book.name });
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={{ height: heroHeight }}>
          <Animated.View style={[StyleSheet.absoluteFill, heroBg]}>
            {!!cover && <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={40} transition={300} />}
            <LinearGradient colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.05)', t.bg]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
          </Animated.View>
          <Animated.View style={[styles.coverWrap, { paddingTop: insets.top + 56 }, coverParallax]}>
            <BookCover uri={cover} width={coverWidth} tag={params.tag} shadow={3} radius={12} />
          </Animated.View>
        </View>

        {/* Title */}
        <View style={styles.titleBlock}>
          {title ? (
            <Txt variant="title" center>
              {title}
            </Txt>
          ) : (
            <Skeleton width={200} height={22} style={{ alignSelf: 'center' }} />
          )}
          {!!subtitle && (
            <Txt variant="body" tone="primary" center style={{ marginTop: -2 }}>
              {subtitle}
            </Txt>
          )}
        </View>

        {book ? (
          <BookBody book={book} />
        ) : query.isError ? (
          <EmptyState icon="cloud-offline-outline" title={errorMessage(query.error)} actionLabel="އަލުން" onAction={() => query.refetch()} />
        ) : (
          <View style={{ padding: 16, gap: 12 }}>
            <Skeleton height={72} radius={16} />
            <Skeleton height={14} />
            <Skeleton height={14} width="85%" />
            <Skeleton height={14} width="60%" />
          </View>
        )}
      </Animated.ScrollView>

      {/* Compact header that appears on scroll */}
      <Animated.View style={[styles.bar, { height: insets.top + 56 }, barStyle]} pointerEvents="none">
        <BlurView intensity={70} tint={t.scheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: t.tabBar, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: t.border }]} />
        <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 12, paddingHorizontal: 72 }}>
          <Txt variant="subheading" center numberOfLines={1}>
            {title}
          </Txt>
        </View>
      </Animated.View>
      <View style={[styles.floating, { top: insets.top + 6 }]} pointerEvents="box-none">
        <BackButton variant="glass" />
        <IconButton name="share-social-outline" variant="glass" onPress={share} accessibilityLabel="ޝެއާ" disabled={!book} />
      </View>

      {book && <ActionBar book={book} />}
    </View>
  );
}

function BookBody({ book }: { book: Book }) {
  const t = useTheme();
  const [expanded, setExpanded] = useState(false);
  const progress = useProgress(book.uuid);
  const year = yearOf(book.published_at);

  const stats = [
    year && { key: 'year', value: <Txt variant="num" ltr color={t.text}>{year}</Txt>, label: book.published_month_name || 'އަހަރު' },
    { key: 'price', value: isFree(book.price) ? <Txt variant="subheading" tone="success">ހިލޭ</Txt> : <PriceTag price={book.price} />, label: 'އަގު' },
    book.pages_count && { key: 'pages', value: <Txt variant="num" ltr color={t.text}>{book.pages_count}</Txt>, label: 'ޞަފްޙާ' },
    book.classification && { key: 'class', value: <ClassificationBadge value={book.classification} size={26} />, label: 'ރޭޓިންގ' },
  ].filter(Boolean) as { key: string; value: React.ReactNode; label: string }[];

  return (
    <Animated.View entering={FadeIn.duration(300)} style={{ paddingHorizontal: 16, gap: 18 }}>
      <View style={[styles.stats, { backgroundColor: t.surface, borderColor: t.border }]}>
        {stats.map((s, i) => (
          <React.Fragment key={s.key}>
            {i > 0 && <View style={[styles.statDivider, { backgroundColor: t.border }]} />}
            <View style={styles.stat}>
              <View style={{ height: 28, justifyContent: 'center' }}>{s.value}</View>
              <Txt variant="caption" tone="muted" numberOfLines={1}>
                {s.label}
              </Txt>
            </View>
          </React.Fragment>
        ))}
      </View>

      {book.purchase_id && progress && (
        <Animated.View entering={FadeInDown} style={[styles.progressCard, { backgroundColor: t.primarySoft }]}>
          <Ionicons name="book" size={18} color={t.primary} />
          <View style={{ flex: 1, gap: 4 }}>
            <Txt variant="label" tone="primary">{`ސަފްޙާ ${progress.page} / ${progress.total} އަށް ކިޔާފައި`}</Txt>
            <ProgressBar value={progress.page / progress.total} height={4} track={t.surface} />
          </View>
        </Animated.View>
      )}

      {(book.has_audio || book.is_printable || book.can_preview) && (
        <View style={styles.features}>
          {book.has_audio && <Feature icon="headset-outline" label="އޯޑިއޯއާއި އެކު" />}
          {book.is_printable && <Feature icon="print-outline" label="ޕްރިންޓް ކުރެވޭ" />}
          {!book.purchase_id && book.can_preview && <Feature icon="eye-outline" label="އަޖުމަ ބެލޭ" />}
          <Feature icon="cloud-download-outline" label="އޮފްލައިން ކިޔޭ" />
        </View>
      )}

      {!!book.excerpt_dv && (
        <PressableScale scaleTo={0.99} onPress={() => setExpanded((v) => !v)}>
          <Txt variant="body" tone="muted" numberOfLines={expanded ? undefined : 5}>
            {book.excerpt_dv}
          </Txt>
          {book.excerpt_dv.length > 220 && (
            <Txt variant="label" tone="primary">
              {expanded ? 'ކުޑަކޮށްލާ' : 'އިތުރަށް ކިޔާ'}
            </Txt>
          )}
        </PressableScale>
      )}

      {!!book.genres?.length && (
        <View style={styles.genres}>
          {book.genres.map((g) => (
            <GenreChip key={g.id} genre={g} />
          ))}
        </View>
      )}

      {!!book.isbn && (
        <Txt variant="caption" tone="faint" ltr center>
          {`ISBN ${book.isbn}`}
        </Txt>
      )}
    </Animated.View>
  );
}

function Feature({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const t = useTheme();
  return (
    <View style={[styles.feature, { backgroundColor: t.surfaceAlt }]}>
      <Ionicons name={icon} size={15} color={t.textMuted} />
      <Txt variant="caption" tone="muted">
        {label}
      </Txt>
    </View>
  );
}

function ActionBar({ book }: { book: Book }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const shadow = useShadow(3);
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const owned = !!book.purchase_id;
  const free = isFree(book.price);
  const target = readerTargetFromBook(book);

  const purchase = async () => {
    setError(null);
    if (target) return openReader(target);
    setLoading(true);
    try {
      const response = await api.post<{ payment_url?: string; id?: string | number }>(`/books/purchase/${book.uuid}`);
      if (response.payment_url) {
        router.push({ pathname: '/payments/pay', params: { payment_url: response.payment_url, slug: book.slug } });
      } else if (response.id) {
        // Free book "purchased": reload the book so we open it with the canonical purchase_id.
        let fresh: Book | null = null;
        try {
          fresh = await api.get<Book>(`/books/preview/${book.slug}`);
          queryClient.setQueryData(['book', book.slug], fresh);
        } catch {}
        const freshTarget = fresh ? readerTargetFromBook(fresh) : null;
        if (freshTarget) openReader(freshTarget);
        else {
          // Same parameters v2 used for this path.
          openReader({ ...readerTargetFromBook(book, true)!, idB64: String(response.id) });
        }
      } else {
        setError('މައްސަލައެއް ދިމާވެއްޖެ، ކުޑައިރުކޮޅަކުން އަލުން މަސައްކަތްކޮށްލައްވާ!');
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const preview = () => {
    const p = readerTargetFromBook(book, true);
    if (p) openReader(p);
  };

  return (
    <Animated.View entering={FadeInDown.springify().damping(18)} style={[styles.actionWrap, { paddingBottom: insets.bottom + 10 }, shadow]}>
      <BlurView intensity={70} tint={t.scheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: t.tabBar, borderTopWidth: StyleSheet.hairlineWidth, borderColor: t.border }]} />
      {!!error && (
        <Animated.View entering={FadeIn} style={[styles.error, { backgroundColor: t.dangerSoft }]}>
          <Ionicons name="alert-circle" size={18} color={t.danger} />
          <Txt variant="bodySmall" tone="danger" style={{ flex: 1 }}>
            {error}
          </Txt>
        </Animated.View>
      )}
      <View style={styles.actions}>
        {!owned && book.can_preview && !free && <Button title="އަޖުމަ ބަލާލާ" variant="outline" onPress={preview} flex size="lg" />}
        <Button
          title={owned || free ? (owned ? 'ފޮތް ކިޔާލާ' : 'ހިލޭ ކިޔާލާ') : 'ފޮތް ގަނެލާ'}
          icon={owned || free ? 'book-outline' : 'cart-outline'}
          onPress={purchase}
          loading={loading}
          flex
          size="lg"
        />
        {owned && target && <DownloadButton target={target} compact />}
        {book.has_audio && (
          <PressableScale
            haptic
            onPress={() => router.push({ pathname: '/books/listen/[uuid]', params: { uuid: book.uuid } })}
            style={[styles.square, { backgroundColor: t.surfaceAlt, borderColor: t.border }]}
            accessibilityLabel="އަޑުއަހާ"
          >
            <Ionicons name="headset" size={22} color={t.primary} />
          </PressableScale>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  coverWrap: { alignItems: 'center' },
  titleBlock: { paddingHorizontal: 24, paddingBottom: 16, gap: 2 },
  bar: { position: 'absolute', top: 0, left: 0, right: 0 },
  floating: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between' },
  stats: { flexDirection: 'row', borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 12 },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: StyleSheet.hairlineWidth, marginVertical: 6 },
  progressCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg },
  features: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill },
  genres: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  actionWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 10, paddingHorizontal: 16, overflow: 'hidden' },
  actions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  error: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: radius.md, marginBottom: 10 },
  square: { width: 56, height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
});
