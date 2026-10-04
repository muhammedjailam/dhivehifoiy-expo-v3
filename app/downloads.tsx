import React, { useMemo } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Paths } from 'expo-file-system';
import Animated, { FadeIn, FadeOut, LinearTransition, useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BookCover } from '@/src/components/book/BookCover';
import { confirmDeleteDownload } from '@/src/components/book/DownloadButton';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { Button } from '@/src/components/ui/Button';
import { Card, Divider, EmptyState, ProgressBar } from '@/src/components/ui/misc';
import { PressableScale } from '@/src/components/ui/PressableScale';
import { Txt } from '@/src/components/ui/Txt';
import { toast } from '@/src/components/ui/Toast';
import {
  cancelDownload,
  deleteDownload,
  dismissDownloadError,
  localThumbUri,
  totalDownloadedBytes,
  useDownloadJobs,
  useDownloads,
  type DownloadRecord,
} from '@/src/lib/downloads';
import { useProgressMap } from '@/src/lib/library';
import { openReaderByUuid } from '@/src/lib/reader';
import { formatBytes, relativeDay } from '@/src/lib/format';
import { radius, useTheme } from '@/src/theme';

export default function Downloads() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const records = useDownloads();
  const jobs = useDownloadJobs();
  const progress = useProgressMap();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const list = useMemo(() => Object.values(records).sort((a, b) => b.downloadedAt - a.downloadedAt), [records]);
  const used = totalDownloadedBytes(records);
  const free = (() => {
    try {
      return Paths.availableDiskSpace;
    } catch {
      return 0;
    }
  })();
  const jobList = Object.entries(jobs);

  const deleteAll = () =>
    Alert.alert('ހުރިހާ ޑައުންލޯޑެއް ފޮހެލަންތަ؟', `${list.length} ފޮތް (${formatBytes(used)}) މި ފޯނުން ފޮހެވޭނެ.`, [
      { text: 'ނޫން', style: 'cancel' },
      {
        text: 'ހުރިހާ ފޮހެލާ',
        style: 'destructive',
        onPress: () => {
          list.forEach((r) => deleteDownload(r.uuid));
          toast('ހުރިހާ ޑައުންލޯޑެއް ފޮހެލައިފި', { kind: 'success' });
        },
      },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader title="ޑައުންލޯޑްތައް" scrollY={scrollY} />
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 16 }}>
        {/* Storage summary */}
        <Card style={styles.summary}>
          <View style={[styles.summaryIcon, { backgroundColor: t.primarySoft }]}>
            <Ionicons name="shield-checkmark" size={26} color={t.primary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="heading">{`${list.length} ފޮތް • ${formatBytes(used)}`}</Txt>
            <Txt variant="caption" tone="muted">{`ފޯނުގައި ހުސްކޮށް ${formatBytes(free)}`}</Txt>
            <ProgressBar value={free + used > 0 ? used / (free + used) : 0} style={{ marginTop: 6 }} />
          </View>
        </Card>
        <View style={[styles.note, { backgroundColor: t.surfaceAlt }]}>
          <Ionicons name="lock-closed" size={16} color={t.textMuted} />
          <Txt variant="caption" tone="muted" style={{ flex: 1 }}>
            ޑައުންލޯޑްކުރާ ފޮތްތައް AES-256 އިން އެންކްރިޕްޓްކޮށް ރައްކާކުރެވޭ. މި އެޕް ނޫން އެހެން ގޮތަކުން އެ ފައިލްތައް ހުޅުވޭކަށް ނެތް.
          </Txt>
        </View>

        {jobList.length > 0 && (
          <View style={{ gap: 8 }}>
            <Txt variant="label" tone="muted">
              ޑައުންލޯޑް ވަމުން
            </Txt>
            <Card>
              {jobList.map(([uuid, job], i) => (
                <Animated.View key={uuid} entering={FadeIn} exiting={FadeOut} layout={LinearTransition}>
                  {i > 0 && <Divider inset={16} />}
                  <View style={styles.jobRow}>
                    <View style={{ flex: 1, gap: 6 }}>
                      <Txt variant="subheading" numberOfLines={1}>
                        {job.name_dv}
                      </Txt>
                      {job.phase === 'error' ? (
                        <Txt variant="caption" tone="danger">
                          {job.error}
                        </Txt>
                      ) : (
                        <>
                          <ProgressBar value={job.progress} />
                          <Txt variant="caption" tone="muted">
                            {job.phase === 'queued'
                              ? 'ތައްޔާރުވަނީ…'
                              : job.phase === 'securing'
                                ? `އެންކްރިޕްޓް ކުރަނީ ${Math.round(job.progress * 100)}%`
                                : `ޑައުންލޯޑް ވަނީ ${Math.round(job.progress * 100)}%`}
                          </Txt>
                        </>
                      )}
                    </View>
                    <PressableScale
                      hitSlop={10}
                      onPress={() => (job.phase === 'error' ? dismissDownloadError(uuid) : cancelDownload(uuid))}
                      style={styles.iconBtn}
                    >
                      <Ionicons name="close-circle" size={24} color={t.textFaint} />
                    </PressableScale>
                  </View>
                </Animated.View>
              ))}
            </Card>
          </View>
        )}

        {list.length === 0 && jobList.length === 0 ? (
          <EmptyState
            icon="cloud-download-outline"
            title="ޑައުންލޯޑްކޮށްފައިވާ ފޮތެއް ނެތް"
            message="ފޮތުގެ ސަފްޙާއިން ނުވަތަ ކިޔާއިރު ޑައުންލޯޑް ބަޓަނަށް ފިއްތާލައްވާ."
          />
        ) : (
          list.length > 0 && (
            <View style={{ gap: 8 }}>
              <Txt variant="label" tone="muted">
                އޮފްލައިންކޮށް ކިޔޭ ފޮތްތައް
              </Txt>
              <Card>
                {list.map((r, i) => (
                  <Animated.View key={r.uuid} entering={FadeIn} exiting={FadeOut} layout={LinearTransition}>
                    {i > 0 && <Divider inset={84} />}
                    <DownloadRow record={r} pct={progress[r.uuid]?.total ? progress[r.uuid].page / progress[r.uuid].total : 0} />
                  </Animated.View>
                ))}
              </Card>
              <Button title="ހުރިހާ ޑައުންލޯޑެއް ފޮހެލާ" icon="trash-outline" variant="danger" onPress={deleteAll} style={{ marginTop: 8 }} />
            </View>
          )
        )}
      </Animated.ScrollView>
    </View>
  );
}

function DownloadRow({ record, pct }: { record: DownloadRecord; pct: number }) {
  const t = useTheme();
  return (
    <PressableScale scaleTo={0.98} onPress={() => openReaderByUuid(record)} style={styles.row}>
      <BookCover uri={record.hasLocalThumb ? localThumbUri(record.uuid) : record.thumb} width={52} radius={6} shadow={1} />
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="subheading" numberOfLines={1}>
          {record.name_dv}
        </Txt>
        <Txt variant="caption" tone="muted">{`${formatBytes(record.size)} • ${relativeDay(record.downloadedAt)}`}</Txt>
        {pct > 0 && <ProgressBar value={pct} height={3} style={{ marginTop: 4, maxWidth: 160 }} />}
      </View>
      <PressableScale hitSlop={10} onPress={() => confirmDeleteDownload(record.uuid, record.name_dv)} style={styles.iconBtn}>
        <Ionicons name="trash-outline" size={21} color={t.danger} />
      </PressableScale>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  summaryIcon: { width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: radius.md, alignItems: 'flex-start' },
  jobRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
