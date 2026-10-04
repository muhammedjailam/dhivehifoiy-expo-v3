import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { PressableScale } from '../ui/PressableScale';
import { ProgressRing } from '../ui/misc';
import { Txt } from '../ui/Txt';
import { toast } from '../ui/Toast';
import {
  cancelDownload,
  deleteDownload,
  startDownload,
  useDownloadJob,
  useDownloadRecord,
} from '../../lib/downloads';
import { COMPROMISED_MESSAGE, COMPROMISED_TITLE, isDeviceCompromised } from '../../lib/security';
import type { ReaderTarget } from '../../lib/reader';
import { radius, useTheme } from '../../theme';

export function requestDownload(target: ReaderTarget) {
  if (isDeviceCompromised()) {
    Alert.alert(COMPROMISED_TITLE, COMPROMISED_MESSAGE);
    return;
  }
  startDownload(target);
  toast('ޑައުންލޯޑް ފެށިއްޖެ', { kind: 'info' });
}

export function confirmDeleteDownload(uuid: string, name: string, onDone?: () => void) {
  Alert.alert('ޑައުންލޯޑް ފޮހެލަންތަ؟', `"${name}" މި ފޯނުން ފޮހެލެވޭނެ. އަލުން ޑައުންލޯޑް ކުރެވޭނެ.`, [
    { text: 'ނޫން', style: 'cancel' },
    {
      text: 'ފޮހެލާ',
      style: 'destructive',
      onPress: () => {
        deleteDownload(uuid);
        toast('ޑައުންލޯޑް ފޮހެލައިފި', { kind: 'success' });
        onDone?.();
      },
    },
  ]);
}

/**
 * Download control with all states: idle → queued → downloading (ring) → securing → done.
 * `compact` renders a 44px round button; otherwise a labelled pill.
 */
export function DownloadButton({ target, compact = false, tint }: { target: ReaderTarget; compact?: boolean; tint?: string }) {
  const t = useTheme();
  const record = useDownloadRecord(target.uuid);
  const job = useDownloadJob(target.uuid);
  const fg = tint ?? t.primary;

  let icon: keyof typeof Ionicons.glyphMap = 'arrow-down-circle-outline';
  let label = 'ޑައުންލޯޑް';
  let ring: number | null = null;
  let onPress = () => requestDownload(target);

  if (record) {
    icon = 'checkmark-circle';
    label = 'ޑައުންލޯޑްކޮށްފައި';
    onPress = () => confirmDeleteDownload(target.uuid, target.name_dv);
  } else if (job?.phase === 'queued') {
    ring = 0;
    label = 'ހުރީ ތައްޔާރުވަމުން';
    onPress = () => cancelDownload(target.uuid);
  } else if (job?.phase === 'downloading') {
    ring = job.progress;
    label = `${Math.round(job.progress * 100)}%`;
    onPress = () =>
      Alert.alert('ޑައުންލޯޑް ހުއްޓާލަންތަ؟', undefined, [
        { text: 'ނޫން', style: 'cancel' },
        { text: 'ހުއްޓާލާ', style: 'destructive', onPress: () => cancelDownload(target.uuid) },
      ]);
  } else if (job?.phase === 'securing') {
    ring = job.progress;
    icon = 'lock-closed';
    label = 'ރައްކާކުރަނީ';
    onPress = () => {};
  } else if (job?.phase === 'error') {
    icon = 'refresh-circle-outline';
    label = 'އަލުން';
  }

  const content =
    ring !== null ? (
      <View style={styles.ringWrap}>
        <ProgressRing value={ring} size={compact ? 26 : 20} stroke={2.5} color={fg} />
        <View style={[StyleSheet.absoluteFill, styles.ringWrap]}>
          <Ionicons name={job?.phase === 'securing' ? 'lock-closed' : 'stop'} size={compact ? 10 : 8} color={fg} />
        </View>
      </View>
    ) : (
      <Ionicons name={icon} size={compact ? 24 : 18} color={record ? t.success : fg} />
    );

  if (compact) {
    return (
      <PressableScale
        haptic
        onPress={onPress}
        accessibilityLabel={label}
        style={[styles.compact, { backgroundColor: t.surfaceAlt, borderColor: t.border }]}
      >
        {content}
      </PressableScale>
    );
  }

  return (
    <PressableScale haptic onPress={onPress} accessibilityLabel={label} style={[styles.pill, { backgroundColor: t.surfaceAlt }]}>
      {content}
      <Txt variant="caption" color={record ? t.success : fg} numberOfLines={1}>
        {label}
      </Txt>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  compact: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  ringWrap: { alignItems: 'center', justifyContent: 'center' },
});
