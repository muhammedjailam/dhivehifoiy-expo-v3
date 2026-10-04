import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import TrackPlayer, { useProgress } from 'react-native-track-player';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAudio } from '@/src/audio/AudioProvider';
import { IconButton } from '@/src/components/ui/IconButton';
import { PressableScale } from '@/src/components/ui/PressableScale';
import { Sheet } from '@/src/components/ui/Sheet';
import { EmptyState, ListRow } from '@/src/components/ui/misc';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { Txt } from '@/src/components/ui/Txt';
import { toast } from '@/src/components/ui/Toast';
import { useChapters } from '@/src/hooks/queries';
import { errorMessage } from '@/src/lib/api';
import { formatDuration } from '@/src/lib/format';
import { radius, useShadow, useTheme } from '@/src/theme';
import type { Chapter } from '@/src/types';

const RATES = [0.75, 1, 1.25, 1.5, 2];

export default function Listen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { uuid } = useLocalSearchParams<{ uuid: string }>();
  const chapters = useChapters(uuid);
  const audio = useAudio();
  const [sleepOpen, setSleepOpen] = useState(false);
  const shadow = useShadow(3);

  const list = chapters.data ?? [];
  const isThisBook = audio.activeBookUuid === uuid;
  const activeId = isThisBook ? (audio.activeTrack as any)?.chapter_uuid : null;
  const activeChapter = list.find((c) => c.uuid === activeId);
  const art = (isThisBook && (audio.activeTrack as any)?.artwork) || list[0]?.cover;
  const artSize = Math.min(width - 96, 320);

  const artStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(isThisBook && audio.isPlaying ? 1 : 0.9, { damping: 14, stiffness: 120 }) }],
  }));

  const playFrom = (chapter: Chapter, index: number) => {
    if (!chapter.can_listen) {
      toast('މި ބައި އަޑުއެހުމަށް ފޮތް ގަންނަވާ', { kind: 'info' });
      return;
    }
    audio.playChapters(list, index);
  };

  const firstPlayable = list.findIndex((c) => c.can_listen);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {!!art && (
        <Animated.View entering={FadeIn.duration(500)} style={StyleSheet.absoluteFill}>
          <Image source={{ uri: art }} style={StyleSheet.absoluteFill} blurRadius={60} contentFit="cover" />
          <LinearGradient colors={['rgba(0,0,0,0.15)', t.bg]} locations={[0, 0.62]} style={StyleSheet.absoluteFill} />
        </Animated.View>
      )}

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <IconButton name="chevron-down" variant="glass" onPress={() => router.back()} accessibilityLabel="ބަންދުކުރޭ" />
        <Txt variant="subheading" color="#fff" style={{ flex: 1 }} center>
          އަޑުއަހާ
        </Txt>
        <IconButton
          name={audio.sleep ? 'moon' : 'moon-outline'}
          variant="glass"
          color={audio.sleep ? '#F2B85B' : '#fff'}
          onPress={() => setSleepOpen(true)}
          accessibilityLabel="ނިދާ ޓައިމަރ"
        />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Animated.View style={[styles.artWrap, { width: artSize, height: artSize }, shadow, artStyle]}>
            {art ? (
              <Image source={{ uri: art }} style={{ width: artSize, height: artSize, borderRadius: radius.xl }} contentFit="cover" transition={300} />
            ) : (
              <Skeleton width={artSize} height={artSize} radius={radius.xl} />
            )}
          </Animated.View>

          <View style={{ alignItems: 'center', marginTop: 20, paddingHorizontal: 24 }}>
            <Txt variant="title" center numberOfLines={2}>
              {activeChapter?.title_dv || activeChapter?.name_dv || list[0]?.name_dv || ' '}
            </Txt>
            <Txt variant="body" tone="muted" center numberOfLines={1}>
              {(isThisBook ? (audio.activeTrack as any)?.artist_dv : list[0]?.artist_dv) || ' '}
            </Txt>
          </View>

          {isThisBook ? (
            <Controls />
          ) : (
            <Animated.View entering={FadeInDown} style={{ marginTop: 24 }}>
              <PressableScale
                haptic
                disabled={firstPlayable < 0}
                onPress={() => firstPlayable >= 0 && audio.playChapters(list, firstPlayable)}
                style={[styles.playAll, { backgroundColor: t.primary }]}
              >
                <Ionicons name="play" size={22} color={t.onPrimary} />
                <Txt variant="button" color={t.onPrimary}>
                  އަޑުއަހަން ފަށާ
                </Txt>
              </PressableScale>
            </Animated.View>
          )}
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: 28 }}>
          <Txt variant="heading" style={{ marginBottom: 8 }}>
            ފޮތުގެ އޯޑިއޯ ބައިތައް
          </Txt>
          {chapters.isLoading ? (
            <View style={{ gap: 10 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} height={64} radius={16} />
              ))}
            </View>
          ) : chapters.isError ? (
            <EmptyState icon="cloud-offline-outline" title={errorMessage(chapters.error)} actionLabel="އަލުން" onAction={() => chapters.refetch()} />
          ) : list.length === 0 ? (
            <EmptyState icon="headset-outline" title="މި ފޮތުގެ އޯޑިއޯއެއް ނެތް" />
          ) : (
            list.map((chapter, index) => (
              <ChapterRow
                key={chapter.uuid}
                chapter={chapter}
                index={index}
                active={chapter.uuid === activeId}
                playing={chapter.uuid === activeId && audio.isPlaying}
                onPress={() => playFrom(chapter, index)}
              />
            ))
          )}
        </View>
      </ScrollView>

      <SleepSheet visible={sleepOpen} onClose={() => setSleepOpen(false)} />
    </View>
  );
}

function Controls() {
  const t = useTheme();
  const audio = useAudio();
  const { position, duration } = useProgress(250);
  const [seek, setSeek] = useState<number | null>(null);

  const nextRate = () => {
    const i = RATES.indexOf(audio.rate);
    audio.setRate(RATES[(i + 1) % RATES.length]);
  };

  return (
    <Animated.View entering={FadeIn} style={{ width: '100%', paddingHorizontal: 24, marginTop: 18 }}>
      <Slider
        value={seek ?? position}
        minimumValue={0}
        maximumValue={Math.max(duration, 1)}
        onValueChange={setSeek}
        onSlidingComplete={async (v) => {
          await TrackPlayer.seekTo(v);
          setSeek(null);
        }}
        minimumTrackTintColor={t.primary}
        maximumTrackTintColor={t.border}
        thumbTintColor={t.primary}
        style={{ height: 36 }}
      />
      <View style={styles.times}>
        <Txt variant="numSmall" ltr tone="muted">
          {formatDuration(seek ?? position)}
        </Txt>
        <Txt variant="numSmall" ltr tone="muted">
          {`-${formatDuration(Math.max(0, duration - (seek ?? position)))}`}
        </Txt>
      </View>

      <View style={styles.controls}>
        <PressableScale haptic onPress={nextRate} style={[styles.rate, { backgroundColor: t.surfaceAlt }]} accessibilityLabel="ސްޕީޑް">
          <Txt variant="numSmall" ltr>{`${audio.rate}x`}</Txt>
        </PressableScale>
        <IconButton name="play-skip-forward" size={26} onPress={() => TrackPlayer.skipToPrevious().catch(() => {})} accessibilityLabel="ކުރީގެ ބައި" />
        <IconButton name="refresh" size={26} onPress={() => TrackPlayer.seekBy(-15)} accessibilityLabel="15 ސިކުންތު ފަހަތަށް" />
        <PressableScale haptic onPress={audio.toggle} scaleTo={0.9} style={[styles.play, { backgroundColor: t.primary }]} accessibilityLabel="ޕްލޭ">
          {audio.isBuffering ? (
            <ActivityIndicator color={t.onPrimary} />
          ) : (
            <Ionicons name={audio.isPlaying ? 'pause' : 'play'} size={34} color={t.onPrimary} />
          )}
        </PressableScale>
        <IconButton name="reload" size={26} onPress={() => TrackPlayer.seekBy(15)} accessibilityLabel="15 ސިކުންތު ކުރިއަށް" />
        <IconButton name="play-skip-back" size={26} onPress={() => TrackPlayer.skipToNext().catch(() => {})} accessibilityLabel="ދެން އޮތް ބައި" />
        <IconButton name="stop-circle-outline" size={24} onPress={audio.stop} accessibilityLabel="ހުއްޓާލާ" />
      </View>
    </Animated.View>
  );
}

function ChapterRow({ chapter, index, active, playing, onPress }: { chapter: Chapter; index: number; active: boolean; playing: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      style={[styles.chapter, { backgroundColor: active ? t.primarySoft : t.surface, borderColor: active ? t.primary : t.border }]}
    >
      <View style={styles.chapterArt}>
        <Image source={{ uri: chapter.cover }} style={styles.chapterImg} contentFit="cover" />
        {active && (
          <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 12 }]}>
            <Ionicons name={playing ? 'volume-high' : 'pause'} size={18} color="#fff" />
          </View>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Txt variant="subheading" numberOfLines={1} color={active ? t.primary : t.text}>
          {chapter.title_dv || chapter.name_dv}
        </Txt>
        <Txt variant="caption" tone="muted">
          {`${index + 1} • ${formatDuration(chapter.duration)}`}
        </Txt>
      </View>
      <Ionicons
        name={chapter.can_listen ? (active ? 'radio-button-on' : 'play-circle-outline') : 'lock-closed-outline'}
        size={chapter.can_listen ? 28 : 20}
        color={chapter.can_listen ? t.primary : t.textFaint}
      />
    </PressableScale>
  );
}

function SleepSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useTheme();
  const audio = useAudio();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!visible || audio.sleep?.kind !== 'minutes') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [visible, audio.sleep]);

  const remaining = useMemo(
    () => (audio.sleep?.kind === 'minutes' ? Math.max(0, Math.round((audio.sleep.endsAt - now) / 1000)) : 0),
    [audio.sleep, now],
  );

  const choose = (mode: 'off' | 'chapter' | number) => {
    audio.setSleep(mode);
    onClose();
    if (mode !== 'off') toast('ނިދާ ޓައިމަރ ހަރުކުރެވިއްޖެ', { kind: 'success' });
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="ނިދާ ޓައިމަރ"
      subtitle={
        audio.sleep?.kind === 'minutes'
          ? `${formatDuration(remaining)} ފަހުން ހުއްޓޭނެ`
          : audio.sleep?.kind === 'chapter'
            ? 'މި ބައި ނިމުމުން ހުއްޓޭނެ'
            : 'އަޑުއެހުން އަމިއްލައަށް ހުއްޓާލާނެ ވަގުތު'
      }
    >
      {[15, 30, 45, 60].map((m) => (
        <ListRow key={m} icon="time-outline" title={`${m} މިނިޓު`} onPress={() => choose(m)} chevron={false} />
      ))}
      <ListRow icon="bookmark-outline" title="މި ބައި ނިމުމުން" onPress={() => choose('chapter')} chevron={false} />
      {audio.sleep && (
        <ListRow icon="close-circle-outline" title="ޓައިމަރ ބާތިލްކުރޭ" destructive onPress={() => choose('off')} chevron={false} />
      )}
      <View style={{ height: 8, backgroundColor: t.elevated }} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8, zIndex: 2 },
  hero: { alignItems: 'center', paddingTop: 16 },
  artWrap: { borderRadius: radius.xl },
  playAll: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 28, height: 56, borderRadius: radius.pill },
  times: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  rate: { width: 44, height: 32, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  play: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  chapter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  chapterArt: { width: 48, height: 48 },
  chapterImg: { width: 48, height: 48, borderRadius: 12 },
  center: { alignItems: 'center', justifyContent: 'center' },
});
