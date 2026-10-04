import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Sheet } from '../ui/Sheet';
import { ListRow } from '../ui/misc';
import { Txt } from '../ui/Txt';
import { BookCover } from './BookCover';
import { confirmDeleteDownload, requestDownload } from './DownloadButton';
import { cancelDownload, useDownloadJob, useDownloadRecord } from '../../lib/downloads';
import { useBookmarks, useProgress } from '../../lib/library';
import { openReader, type ReaderTarget } from '../../lib/reader';
import { formatBytes } from '../../lib/format';

/** Long-press menu for an owned book. */
export function BookActionsSheet({ target, onClose }: { target: ReaderTarget | null; onClose: () => void }) {
  return (
    <Sheet visible={!!target} onClose={onClose}>
      {target && <Body target={target} onClose={onClose} />}
    </Sheet>
  );
}

function Body({ target, onClose }: { target: ReaderTarget; onClose: () => void }) {
  const record = useDownloadRecord(target.uuid);
  const job = useDownloadJob(target.uuid);
  const progress = useProgress(target.uuid);
  const bookmarks = useBookmarks(target.uuid);

  const run = (fn: () => void) => () => {
    onClose();
    setTimeout(fn, 180);
  };

  return (
    <View>
      <View style={styles.head}>
        <BookCover uri={target.thumb} width={56} shadow={1} radius={6} />
        <View style={{ flex: 1 }}>
          <Txt variant="heading" numberOfLines={2}>
            {target.name_dv}
          </Txt>
          {progress && (
            <Txt variant="caption" tone="muted">
              {`ސަފްޙާ ${progress.page} / ${progress.total}`}
            </Txt>
          )}
        </View>
      </View>
      <ListRow icon="book-outline" title={progress ? 'ކިޔަމުން ދިޔަ ތަނުން ކިޔާ' : 'ފޮތް ކިޔާލާ'} onPress={run(() => openReader(target))} />
      {record ? (
        <ListRow
          icon="trash-outline"
          title="ޑައުންލޯޑް ފޮހެލާ"
          subtitle={`${formatBytes(record.size)} • އޮފްލައިން ކިޔޭނެ`}
          destructive
          onPress={run(() => confirmDeleteDownload(target.uuid, target.name_dv))}
        />
      ) : job && job.phase !== 'error' ? (
        <ListRow
          icon="stop-circle-outline"
          title="ޑައުންލޯޑް ހުއްޓާލާ"
          subtitle={`${Math.round(job.progress * 100)}%`}
          onPress={run(() => cancelDownload(target.uuid))}
        />
      ) : (
        <ListRow
          icon="arrow-down-circle-outline"
          title="އޮފްލައިންކޮށް ކިޔުމަށް ޑައުންލޯޑްކުރޭ"
          subtitle="އެންކްރިޕްޓްކޮށް، ރައްކާތެރިކޮށް މި ފޯނުގައި ބެހެއްޓޭނެ"
          onPress={run(() => requestDownload(target))}
        />
      )}
      {bookmarks.length > 0 && (
        <ListRow
          icon="bookmark-outline"
          title="ބުކްމާކްތައް"
          subtitle={`${bookmarks.length} ބުކްމާކް`}
          onPress={run(() => router.push({ pathname: '/bookmarks', params: { uuid: target.uuid } }))}
        />
      )}
      <ListRow
        icon="information-circle-outline"
        title="ފޮތުގެ ތަފްޞީލް"
        onPress={run(() => router.push({ pathname: '/books/[slug]', params: { slug: target.slug, thumb: target.thumb, name_dv: target.name_dv } }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 12, paddingHorizontal: 4 },
});
