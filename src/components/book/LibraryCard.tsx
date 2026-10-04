import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BookCover } from './BookCover';
import { PressableScale } from '../ui/PressableScale';
import { ProgressBar, ProgressRing } from '../ui/misc';
import { Txt } from '../ui/Txt';
import { useDownloadJob, useDownloadRecord } from '../../lib/downloads';
import { useProgress } from '../../lib/library';
import { useTheme } from '../../theme';

type Props = {
  uuid: string;
  name: string;
  thumb: string;
  subtitle?: string | null;
  width: number;
  tag?: string;
  onPress: () => void;
  onLongPress?: () => void;
};

/** Owned-book card: reading progress + live download state. */
export const LibraryCard = memo(function LibraryCard({ uuid, name, thumb, subtitle, width, tag, onPress, onLongPress }: Props) {
  const t = useTheme();
  const progress = useProgress(uuid);
  const record = useDownloadRecord(uuid);
  const job = useDownloadJob(uuid);
  const pct = progress?.total ? progress.page / progress.total : 0;
  const active = job && job.phase !== 'error';

  return (
    <PressableScale onPress={onPress} onLongPress={onLongPress} delayLongPress={300} style={{ width }} accessibilityLabel={name}>
      <BookCover uri={thumb} width={width} tag={tag}>
        {active && (
          <View style={[StyleSheet.absoluteFill, styles.jobOverlay]}>
            <View style={styles.ringBg}>
              <ProgressRing value={job.progress} size={40} stroke={3.5} color="#fff" track="rgba(255,255,255,0.25)" />
              <View style={[StyleSheet.absoluteFill, styles.center]}>
                <Ionicons name={job.phase === 'securing' ? 'lock-closed' : 'arrow-down'} size={14} color="#fff" />
              </View>
            </View>
          </View>
        )}
        {record && (
          <View style={[styles.badge, { backgroundColor: t.success }]}>
            <Ionicons name="arrow-down" size={12} color="#fff" />
          </View>
        )}
        {job?.phase === 'error' && (
          <View style={[styles.badge, { backgroundColor: t.danger }]}>
            <Ionicons name="alert" size={12} color="#fff" />
          </View>
        )}
      </BookCover>
      {pct > 0 && <ProgressBar value={pct} height={3} style={{ marginTop: 8 }} />}
      <Txt variant="label" numberOfLines={1} style={{ marginTop: 6 }}>
        {name}
      </Txt>
      <Txt variant="caption" tone="muted" numberOfLines={1} style={{ marginTop: -3 }}>
        {progress ? (pct >= 0.99 ? 'ކިޔާ ނިމިއްޖެ' : `${Math.round(pct * 100)}% ކިޔާފައި`) : subtitle || ' '}
      </Txt>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  jobOverlay: { backgroundColor: 'rgba(10,8,16,0.45)', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  ringBg: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 6,
    end: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
});
