import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Image as RNImage, Platform, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { File } from 'expo-file-system';
import * as Print from 'expo-print';
import * as ScreenCapture from 'expo-screen-capture';
import * as ScreenOrientation from 'expo-screen-orientation';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import Slider from '@react-native-community/slider';
import Pdf, { type PdfRef, type TableContent } from 'react-native-pdf';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BackButton } from '@/src/components/ui/ScreenHeader';
import { IconButton, type IconName } from '@/src/components/ui/IconButton';
import { PressableScale } from '@/src/components/ui/PressableScale';
import { Button } from '@/src/components/ui/Button';
import { ProgressBar, useIsOffline } from '@/src/components/ui/misc';
import { Txt } from '@/src/components/ui/Txt';
import { toast } from '@/src/components/ui/Toast';
import { requestDownload } from '@/src/components/book/DownloadButton';
import { BookmarksSheet, GoToPageSheet, ReaderSettingsSheet, TocSheet } from '@/src/reader/ReaderSheets';
import { getToken } from '@/src/lib/api';
import { deleteDownload, isDownloaded, useDownloadJob, useDownloadRecord } from '@/src/lib/downloads';
import { libraryStore, saveProgress, toggleBookmark, useBookmarks } from '@/src/lib/library';
import { isPreviewKey, pdfPassword, printUrl, readUrl, type ReaderTarget } from '@/src/lib/reader';
import { COMPROMISED_MESSAGE, COMPROMISED_TITLE, isDeviceCompromised } from '@/src/lib/security';
import { useSettings } from '@/src/lib/settings';
import { decryptToTemp, deleteQuietly, newTempFile } from '@/src/lib/vault';
import { ForceDark, radius } from '@/src/theme';

type Params = {
  uuid: string;
  id: string;
  thumb?: string;
  name_dv?: string;
  slug?: string;
  printable?: string;
  listenable?: string;
};

/** Always a local file: the decrypted vault copy, or a stream we downloaded ourselves. */
type Source = { kind: 'decrypted' | 'streamed'; file: File };

const TINTS = {
  none: { bg: '#3A3A3C', overlay: null as string | null },
  sepia: { bg: '#4A3F33', overlay: 'rgba(240, 200, 140, 0.20)' },
  night: { bg: '#000000', overlay: 'rgba(0, 0, 0, 0.42)' },
};

export default function ReaderScreen() {
  const params = useLocalSearchParams<Params>();
  const { uuid, id } = params;
  const [blocked] = useState(() => isDeviceCompromised());

  // ---- content protection (same guarantees as v2, plus app-switcher privacy) ----
  ScreenCapture.usePreventScreenCapture('reader');
  useEffect(() => {
    if (Platform.OS === 'ios') ScreenCapture.enableAppSwitcherProtectionAsync(1).catch(() => {});
    return () => {
      if (Platform.OS === 'ios') ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => {});
    };
  }, []);
  useEffect(() => {
    if (Platform.OS !== 'ios') return; // Android: FLAG_SECURE already blanks screenshots.
    const sub = ScreenCapture.addScreenshotListener(() =>
      toast('ފޮތުގެ ސްކްރީންޝޮޓް ނެގުމުގެ ހުއްދައެއް ނެތް', { kind: 'error' }),
    );
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (blocked) Alert.alert(COMPROMISED_TITLE, COMPROMISED_MESSAGE);
  }, [blocked]);

  if (blocked) {
    return (
      <ForceDark>
        <BlockedView />
      </ForceDark>
    );
  }
  if (!uuid || !id) return null;

  return (
    <ForceDark>
      <Reader params={params} />
    </ForceDark>
  );
}

function Reader({ params }: { params: Params }) {
  const insets = useSafeAreaInsets();
  const { uuid, id } = params;
  const preview = isPreviewKey(uuid, id);
  const printable = params.printable === 'true' && !preview;
  const listenable = params.listenable === 'true';
  const settings = useSettings((s) => s.reader);
  const offline = useIsOffline();
  const record = useDownloadRecord(uuid);
  const job = useDownloadJob(uuid);
  const bookmarks = useBookmarks(uuid);

  const pdfRef = useRef<PdfRef>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [prepProgress, setPrepProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [toc, setToc] = useState<TableContent[] | undefined>();
  const [chrome, setChrome] = useState(true);
  const [sheet, setSheet] = useState<null | 'settings' | 'bookmarks' | 'goto' | 'toc'>(null);
  const [printing, setPrinting] = useState(false);
  const [backgrounded, setBackgrounded] = useState(false);
  const [pagePill, setPagePill] = useState(false);

  const initialPage = useRef(preview ? 1 : libraryStore.get().progress[uuid]?.page ?? 1);
  const pageRef = useRef(initialPage.current);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pillTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumedToast = useRef(false);
  const printFiles = useRef<File[]>([]);
  useEffect(() => () => printFiles.current.forEach((f) => deleteQuietly(f)), []);

  const target: ReaderTarget = useMemo(
    () => ({
      uuid,
      idB64: id,
      slug: params.slug ?? '',
      name_dv: params.name_dv ?? '',
      thumb: params.thumb ?? '',
      can_print: printable,
      can_listen: listenable,
    }),
    [uuid, id, params.slug, params.name_dv, params.thumb, printable, listenable],
  );

  // ---- resolve the PDF source: encrypted local copy first, otherwise stream ----
  // Decided once per (re)try so a download finishing mid-read doesn't reload the book.
  const [usingLocal, setUsingLocal] = useState(() => !preview && isDownloaded(uuid));
  useEffect(() => {
    let cancelled = false;
    const hasLocal = !preview && isDownloaded(uuid);
    const controller = new AbortController();
    let file: File | null = null;
    setUsingLocal(hasLocal);
    setError(null);
    setSource(null);
    setLoaded(false);
    setPrepProgress(0);

    (async () => {
      try {
        if (hasLocal) {
          file = await decryptToTemp(uuid, (p) => !cancelled && setPrepProgress(p));
        } else {
          if (offline) {
            setError('offline');
            return;
          }
          // We download the stream ourselves (instead of letting react-native-pdf do it) so it
          // can be aborted, lands in the swept temp dir, and survives layout remounts.
          const token = await getToken();
          file = newTempFile('rs', 'pdf');
          await File.downloadFileAsync(readUrl(uuid, id), file, {
            headers: { Authorization: `Bearer ${token}` },
            idempotent: true,
            signal: controller.signal,
            onProgress: ({ bytesWritten, totalBytes }) => {
              if (!cancelled && totalBytes > 0) setPrepProgress(bytesWritten / totalBytes);
            },
          });
        }
        if (cancelled) return deleteQuietly(file);
        setSource({ kind: hasLocal ? 'decrypted' : 'streamed', file: file! });
      } catch (e: any) {
        deleteQuietly(file);
        if (cancelled) return;
        console.warn('[reader] prepare failed', e);
        setError(hasLocal ? 'corrupt' : 'load');
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      // Never leave a readable copy behind.
      deleteQuietly(file);
    };
    // `offline` intentionally only matters for the first resolution / retries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uuid, id, preview, attempt]);

  // ---- keep awake / orientation lock ----
  useEffect(() => {
    if (!settings.keepAwake) return;
    activateKeepAwakeAsync('reader').catch(() => {});
    return () => {
      deactivateKeepAwake('reader').catch(() => {});
    };
  }, [settings.keepAwake]);

  useEffect(() => {
    if (!settings.lockOrientation) return;
    ScreenOrientation.getOrientationAsync().then((o) => {
      const landscape = o === ScreenOrientation.Orientation.LANDSCAPE_LEFT || o === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;
      ScreenOrientation.lockAsync(landscape ? ScreenOrientation.OrientationLock.LANDSCAPE : ScreenOrientation.OrientationLock.PORTRAIT).catch(() => {});
    });
    return () => {
      ScreenOrientation.unlockAsync().catch(() => {});
    };
  }, [settings.lockOrientation]);

  // ---- privacy shield whenever the app is not in the foreground ----
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setBackgrounded(s !== 'active'));
    return () => sub.remove();
  }, []);

  // ---- chrome auto-hide ----
  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setChrome(false), 3500);
  }, []);
  useEffect(() => {
    if (loaded) scheduleHide();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (pillTimer.current) clearTimeout(pillTimer.current);
    };
  }, [loaded, scheduleHide]);

  const toggleChrome = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setChrome((c) => !c);
  }, []);

  const jumpTo = useCallback(
    (p: number) => {
      const next = Math.max(1, Math.min(total || p, Math.round(p)));
      pdfRef.current?.setPage(next);
    },
    [total],
  );

  const onPageChanged = useCallback(
    (p: number, n: number) => {
      pageRef.current = p;
      setPage(p);
      if (n) setTotal(n);
      if (!preview && loaded) saveProgress(uuid, p, n);
      if (!chrome) {
        setPagePill(true);
        if (pillTimer.current) clearTimeout(pillTimer.current);
        pillTimer.current = setTimeout(() => setPagePill(false), 1400);
      }
    },
    [preview, loaded, uuid, chrome],
  );

  const onLoadComplete = useCallback(
    (n: number, _path: string, _size: unknown, tableContents?: TableContent[]) => {
      setTotal(n);
      setToc(tableContents);
      setLoaded(true);
      if (!preview) saveProgress(uuid, pageRef.current, n);
      if (!resumedToast.current && initialPage.current > 1) {
        resumedToast.current = true;
        toast(`ސަފްޙާ ${initialPage.current} އިން ފެށުނީ`, {
          action: { label: 'ފުރަތަމައިން', onPress: () => pdfRef.current?.setPage(1) },
        });
      }
    },
    [preview, uuid],
  );

  const onError = useCallback(
    (e: any) => {
      console.warn('[reader] pdf error', e?.message ?? e);
      setError(source?.kind === 'decrypted' ? 'corrupt' : 'load');
    },
    [source?.kind],
  );

  const isBookmarked = bookmarks.some((b) => b.page === page);

  const onToggleBookmark = () => {
    const added = toggleBookmark(uuid, page);
    toast(added ? `ސަފްޙާ ${page} ބުކްމާކް ކުރެވިއްޖެ` : 'ބުކްމާކް ނަގާލެވިއްޖެ', {
      kind: added ? 'success' : 'info',
      action: added ? { label: 'ނޯޓް', onPress: () => setSheet('bookmarks') } : undefined,
    });
  };

  const print = async () => {
    setPrinting(true);
    const file = newTempFile('pr', 'pdf');
    printFiles.current.push(file);
    try {
      const token = await getToken();
      await File.downloadFileAsync(printUrl(uuid, id), file, { headers: { Authorization: `Bearer ${token}` }, idempotent: true });
      await Print.printAsync({ uri: file.uri, orientation: Print.Orientation.portrait });
      // iOS resolves once printing is done; Android's print service keeps reading the file
      // while its dialog is open, so there it is removed when the reader closes.
      if (Platform.OS === 'ios') deleteQuietly(file);
    } catch (e) {
      console.warn('print failed', e);
      toast('ޕްރިންޓް ނުކުރެވުނު', { kind: 'error' });
    } finally {
      setPrinting(false);
    }
  };

  const tint = TINTS[settings.tint] ?? TINTS.none;
  const horizontal = settings.mode === 'horizontal';
  // NOTE: on Android every native prop change reloads the whole document, so all native
  // props are frozen per mount and layout changes remount the view at the current page.
  const pdfKey = `${settings.mode}-${settings.fit}-${settings.rtl}-${settings.tint}-${attempt}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mountPage = useMemo(() => pageRef.current, [pdfKey]);

  const pdfSource = useMemo(() => (source ? { uri: source.file.uri } : null), [source]);

  const chromeStyle = useAnimatedStyle(() => ({ opacity: withTiming(chrome ? 1 : 0, { duration: 220 }) }), [chrome]);
  const topStyle = useAnimatedStyle(() => ({ transform: [{ translateY: withTiming(chrome ? 0 : -24, { duration: 220 }) }] }), [chrome]);
  const bottomStyle = useAnimatedStyle(() => ({ transform: [{ translateY: withTiming(chrome ? 0 : 24, { duration: 220 }) }] }), [chrome]);

  const tools: { id: string; icon: IconName; label: string; onPress: () => void; show: boolean; busy?: boolean; active?: boolean }[] = [
    { id: 'toc', icon: 'list-outline', label: 'ފިހުރިސްތު', onPress: () => setSheet('toc'), show: !!toc?.length },
    { id: 'bookmarks', icon: 'bookmarks-outline', label: 'ބުކްމާކް', onPress: () => setSheet('bookmarks'), show: !preview },
    { id: 'goto', icon: 'navigate-outline', label: 'ސަފްޙާ', onPress: () => setSheet('goto'), show: total > 1 },
    { id: 'settings', icon: 'options-outline', label: 'ކިޔާ ގޮތް', onPress: () => setSheet('settings'), show: true },
    {
      id: 'listen',
      icon: 'headset-outline',
      label: 'އަޑުއަހާ',
      onPress: () => router.push({ pathname: '/books/listen/[uuid]', params: { uuid } }),
      show: listenable,
    },
    { id: 'print', icon: 'print-outline', label: 'ޕްރިންޓް', onPress: print, show: printable, busy: printing },
    {
      id: 'download',
      icon: record ? 'checkmark-circle' : job && job.phase !== 'error' ? 'cloud-download' : 'cloud-download-outline',
      label: record ? 'އޮފްލައިން' : job && job.phase !== 'error' ? `${Math.round(job.progress * 100)}%` : 'ޑައުންލޯޑް',
      onPress: () => (record ? toast('މި ފޮތް އޮފްލައިންކޮށް ކިޔޭނެ', { kind: 'success' }) : requestDownload(target)),
      show: !preview,
      active: !!record,
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: tint.bg }]}>
      <StatusBar hidden={!chrome} style="light" animated />

      {pdfSource && !error && (
        <Pdf
          key={pdfKey}
          ref={pdfRef}
          source={pdfSource}
          password={pdfPassword(uuid, id)}
          page={mountPage}
          horizontal={horizontal}
          enablePaging={horizontal}
          enableRTL={horizontal && settings.rtl && Platform.OS === 'ios'}
          fitPolicy={settings.fit}
          spacing={horizontal ? 0 : 6}
          minScale={1}
          maxScale={5}
          enableDoubleTapZoom
          enableAntialiasing
          enableAnnotationRendering
          enableTextSelection={false}
          trustAllCerts={false}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          onLoadComplete={onLoadComplete}
          onPageChanged={onPageChanged}
          onPageSingleTap={toggleChrome}
          onError={onError}
          onPressLink={() => {
            /* external links are intentionally not followed from protected books */
          }}
          renderActivityIndicator={() => <View />}
          style={[styles.pdf, { backgroundColor: tint.bg }]}
        />
      )}

      {/* colour / brightness filters — purely visual, never touch the document */}
      {tint.overlay && <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tint.overlay }]} />}
      {settings.dim > 0 && <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${settings.dim})` }]} />}

      {!loaded && !error && (
        <LoadingCover
          thumb={params.thumb}
          title={params.name_dv}
          progress={prepProgress}
          label={usingLocal ? 'ރައްކާތެރިކޮށް ހުޅުވަނީ…' : 'ފޮތް ލޯޑުކުރަނީ…'}
        />
      )}

      {error && (
        <ErrorView
          kind={error}
          thumb={params.thumb}
          onRetry={() => setAttempt((a) => a + 1)}
          onRemoveDownload={
            error === 'corrupt'
              ? () => {
                  deleteDownload(uuid);
                  setAttempt((a) => a + 1);
                }
              : undefined
          }
        />
      )}

      {/* Top bar */}
      <Animated.View pointerEvents={chrome ? 'box-none' : 'none'} style={[styles.top, { paddingTop: insets.top + 6 }, chromeStyle, topStyle]}>
        <View style={styles.topRow}>
          <BackButton variant="glass" />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Txt variant="subheading" color="#fff" numberOfLines={1}>
              {params.name_dv}
            </Txt>
            <Txt variant="caption" color="rgba(255,255,255,0.7)" numberOfLines={1}>
              {preview ? 'އަޖުމަ' : total ? `ސަފްޙާ ${page} / ${total}` : ' '}
            </Txt>
          </View>
          {!preview ? (
            <IconButton
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              variant="glass"
              color={isBookmarked ? '#F2B85B' : '#fff'}
              onPress={onToggleBookmark}
              accessibilityLabel="ބުކްމާކް"
              disabled={!loaded}
            />
          ) : (
            <View style={{ width: 42 }} />
          )}
        </View>
      </Animated.View>

      {/* Bottom bar */}
      <Animated.View pointerEvents={chrome ? 'box-none' : 'none'} style={[styles.bottom, { paddingBottom: insets.bottom + 8 }, chromeStyle, bottomStyle]}>
        {total > 1 && (
          <View style={styles.sliderRow}>
            <Txt variant="numSmall" ltr color="rgba(255,255,255,0.8)" style={styles.sliderLabel}>
              {page}
            </Txt>
            <Slider
              style={{ flex: 1, height: 36 }}
              minimumValue={1}
              maximumValue={total}
              step={1}
              value={page}
              onSlidingStart={() => hideTimer.current && clearTimeout(hideTimer.current)}
              onSlidingComplete={(v) => {
                jumpTo(v);
                scheduleHide();
              }}
              minimumTrackTintColor="#B39DDB"
              maximumTrackTintColor="rgba(255,255,255,0.25)"
              thumbTintColor="#fff"
            />
            <Txt variant="numSmall" ltr color="rgba(255,255,255,0.6)" style={styles.sliderLabel}>
              {total}
            </Txt>
          </View>
        )}
        <View style={styles.tools}>
          {tools
            .filter((tool) => tool.show)
            .map((tool) => (
              <PressableScale key={tool.id} haptic onPress={tool.onPress} style={styles.tool} disabled={tool.busy} accessibilityLabel={tool.label}>
                <Ionicons name={tool.icon} size={22} color={tool.active ? '#4CC38A' : '#fff'} />
                <Txt variant="caption" color="rgba(255,255,255,0.75)" numberOfLines={1} style={{ fontSize: 10, lineHeight: 16 }}>
                  {tool.busy ? '…' : tool.label}
                </Txt>
              </PressableScale>
            ))}
        </View>
      </Animated.View>

      {/* Floating page pill while chrome is hidden */}
      {!chrome && pagePill && total > 0 && (
        <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(300)} pointerEvents="none" style={[styles.pill, { bottom: insets.bottom + 18 }]}>
          <Txt variant="numSmall" ltr color="#fff">{`${page} / ${total}`}</Txt>
        </Animated.View>
      )}

      {backgrounded && <PrivacyShield />}

      <ReaderSettingsSheet visible={sheet === 'settings'} onClose={() => setSheet(null)} />
      <BookmarksSheet visible={sheet === 'bookmarks'} onClose={() => setSheet(null)} uuid={uuid} page={page} onJump={jumpTo} />
      <GoToPageSheet visible={sheet === 'goto'} onClose={() => setSheet(null)} total={total} page={page} onJump={jumpTo} />
      <TocSheet visible={sheet === 'toc'} onClose={() => setSheet(null)} toc={toc} page={page} onJump={jumpTo} />
    </View>
  );
}

function LoadingCover({ thumb, title, progress, label }: { thumb?: string; title?: string; progress: number; label: string }) {
  return (
    <Animated.View exiting={FadeOut.duration(300)} style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: '#0F0D14' }]}>
      {!!thumb && <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} blurRadius={50} contentFit="cover" />}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)' }]} />
      {!!thumb && <Image source={{ uri: thumb }} style={styles.loadingCover} contentFit="cover" />}
      <Txt variant="heading" color="#fff" center numberOfLines={2} style={{ marginTop: 18, paddingHorizontal: 32 }}>
        {title}
      </Txt>
      <View style={{ width: 180, marginTop: 14, gap: 8 }}>
        <ProgressBar value={progress} track="rgba(255,255,255,0.2)" color="#B39DDB" />
        <Txt variant="caption" color="rgba(255,255,255,0.7)" center>
          {`${label} ${progress > 0 ? `${Math.round(progress * 100)}%` : ''}`}
        </Txt>
      </View>
    </Animated.View>
  );
}

function ErrorView({
  kind,
  thumb,
  onRetry,
  onRemoveDownload,
}: {
  kind: string;
  thumb?: string;
  onRetry: () => void;
  onRemoveDownload?: () => void;
}) {
  const copy =
    kind === 'offline'
      ? { icon: 'cloud-offline-outline' as const, title: 'އިންޓަނެޓް ކަނެކްޝަނެއް ނެތް', message: 'މި ފޮތް އޮފްލައިންކޮށް ކިޔުމަށް، އިންޓަނެޓާ ގުޅިފައިވާއިރު ޑައުންލޯޑް ކުރައްވާ.' }
      : kind === 'corrupt'
        ? { icon: 'warning-outline' as const, title: 'ޑައުންލޯޑްކުރި ފައިލް ހުޅުވޭކަށް ނެތް', message: 'ޑައުންލޯޑް ފޮހެލާފައި އަލުން ޑައުންލޯޑް ކުރައްވާ.' }
        : { icon: 'alert-circle-outline' as const, title: 'ފޮތް ހުޅުވޭކަށް ނެތް', message: 'ކުޑައިރުކޮޅަކުން އަލުން މަސައްކަތްކޮށްލައްވާ.' };
  return (
    <Animated.View entering={FadeIn} style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: '#0F0D14', padding: 32 }]}>
      {!!thumb && <Image source={{ uri: thumb }} style={[StyleSheet.absoluteFill, { opacity: 0.25 }]} blurRadius={50} contentFit="cover" />}
      <Ionicons name={copy.icon} size={48} color="#B39DDB" />
      <Txt variant="heading" color="#fff" center style={{ marginTop: 12 }}>
        {copy.title}
      </Txt>
      <Txt variant="bodySmall" color="rgba(255,255,255,0.7)" center>
        {copy.message}
      </Txt>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
        {onRemoveDownload ? (
          <Button title="ފޮހެލާފައި އަލުން" icon="refresh" onPress={onRemoveDownload} />
        ) : (
          <Button title="އަލުން" icon="refresh" onPress={onRetry} />
        )}
        <Button title="ފަހަތަށް" variant="ghost" onPress={() => router.back()} />
      </View>
    </Animated.View>
  );
}

function PrivacyShield() {
  return (
    <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: '#0F0D14' }]}>
      <RNImage source={require('../../../assets/images/logo.png')} tintColor="#fff" resizeMode="contain" style={{ width: 120, height: 80, opacity: 0.8 }} />
    </View>
  );
}

function BlockedView() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, styles.center, { backgroundColor: '#0F0D14', padding: 32, paddingTop: insets.top + 32 }]}>
      <Ionicons name="shield-half-outline" size={56} color="#F06A75" />
      <Txt variant="heading" color="#fff" center style={{ marginTop: 12 }}>
        {COMPROMISED_TITLE}
      </Txt>
      <Txt variant="bodySmall" color="rgba(255,255,255,0.7)" center>
        {COMPROMISED_MESSAGE}
      </Txt>
      <Button title="ފަހަތަށް" variant="secondary" onPress={() => router.back()} style={{ marginTop: 18 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pdf: { flex: 1, width: '100%' },
  center: { alignItems: 'center', justifyContent: 'center' },
  top: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: 'rgba(12,10,18,0.82)', paddingBottom: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10 },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(12,10,18,0.86)', paddingTop: 6 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 6 },
  sliderLabel: { minWidth: 34, textAlign: 'center' },
  tools: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 6, paddingTop: 2 },
  tool: { alignItems: 'center', minWidth: 52, paddingVertical: 4, gap: 1 },
  pill: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(12,10,18,0.75)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  loadingCover: { width: 150, height: 214, borderRadius: 10 },
});
