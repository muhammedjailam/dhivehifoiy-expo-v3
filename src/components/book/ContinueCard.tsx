import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BookCover } from './BookCover';
import { PressableScale } from '../ui/PressableScale';
import { Txt } from '../ui/Txt';
import { ProgressBar } from '../ui/misc';
import { openReaderByUuid } from '../../lib/reader';
import type { BookMeta, ReadingProgress } from '../../lib/library';
import { useTheme } from '../../theme';

/** "Continue reading" card: cover + progress + page count, opens straight into the reader. */
export const ContinueCard = memo(function ContinueCard({
  meta,
  progress,
  width,
  downloaded,
  onLongPress,
}: {
  meta: BookMeta;
  progress?: ReadingProgress;
  width: number;
  downloaded?: boolean;
  onLongPress?: () => void;
}) {
  const t = useTheme();
  const pct = progress && progress.total ? progress.page / progress.total : 0;
  return (
    <PressableScale onPress={() => openReaderByUuid(meta)} onLongPress={onLongPress} style={{ width }} accessibilityLabel={meta.name_dv}>
      <BookCover uri={meta.thumb} width={width}>
        <View style={[styles.playBadge, { backgroundColor: t.primary }]}>
          <Ionicons name="book" size={13} color={t.onPrimary} />
        </View>
        {downloaded && (
          <View style={[styles.offline, { backgroundColor: t.success }]}>
            <Ionicons name="arrow-down" size={11} color="#fff" />
          </View>
        )}
      </BookCover>
      <ProgressBar value={pct} height={3} style={{ marginTop: 8 }} />
      <Txt variant="label" numberOfLines={1} style={{ marginTop: 4 }}>
        {meta.name_dv}
      </Txt>
      {progress && (
        <Txt variant="caption" tone="muted" style={{ marginTop: -3 }}>
          {`ސަފްޙާ ${progress.page} / ${progress.total}`}
        </Txt>
      )}
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  playBadge: {
    position: 'absolute',
    bottom: 6,
    start: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offline: {
    position: 'absolute',
    top: 6,
    end: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
