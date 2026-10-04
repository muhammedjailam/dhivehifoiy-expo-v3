import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  State,
  useActiveTrack,
  usePlaybackState,
  useTrackPlayerEvents,
  type Track,
} from 'react-native-track-player';
import { API_URL } from '../config';
import { getToken } from '../lib/api';
import { toast } from '../components/ui/Toast';
import type { Chapter } from '../types';

export type SleepMode = { kind: 'minutes'; endsAt: number } | { kind: 'chapter' } | null;

type AudioApi = {
  ready: boolean;
  activeTrack: Track | undefined;
  activeBookUuid: string | null;
  isPlaying: boolean;
  isBuffering: boolean;
  rate: number;
  sleep: SleepMode;
  playChapters: (chapters: Chapter[], startIndex: number) => Promise<void>;
  toggle: () => Promise<void>;
  stop: () => Promise<void>;
  setRate: (rate: number) => void;
  setSleep: (mode: 'off' | 'chapter' | number) => void;
};

const AudioContext = createContext<AudioApi | null>(null);

export const useAudio = () => {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error('useAudio outside AudioProvider');
  return ctx;
};

async function setupPlayer() {
  try {
    await TrackPlayer.setupPlayer({ autoHandleInterruptions: true });
  } catch (e: any) {
    // Already initialised (fast refresh / re-mount) is fine.
    if (!String(e?.message ?? e).toLowerCase().includes('already')) throw e;
  }
  await TrackPlayer.updateOptions({
    android: { appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification },
    capabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
      Capability.SeekTo,
      Capability.JumpForward,
      Capability.JumpBackward,
      Capability.Stop,
    ],
    notificationCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext, Capability.SkipToPrevious, Capability.SeekTo],
    forwardJumpInterval: 15,
    backwardJumpInterval: 15,
    progressUpdateEventInterval: 1,
    color: 0x7e57c2,
  });
}

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [rate, setRateState] = useState(1);
  const [sleep, setSleepState] = useState<SleepMode>(null);
  const sleepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeTrack = useActiveTrack();
  const playback = usePlaybackState();

  useEffect(() => {
    let mounted = true;
    setupPlayer()
      .then(() => mounted && setReady(true))
      .catch((e) => console.warn('Track player setup failed', e));
    return () => {
      mounted = false;
    };
  }, []);

  const ensureReady = useCallback(async () => {
    if (!ready) {
      await setupPlayer();
      setReady(true);
    }
  }, [ready]);

  const clearSleep = useCallback(() => {
    if (sleepTimer.current) clearTimeout(sleepTimer.current);
    sleepTimer.current = null;
    setSleepState(null);
  }, []);

  const playChapters = useCallback(
    async (chapters: Chapter[], startIndex: number) => {
      try {
        await ensureReady();
        const token = await getToken();
        const playable = chapters.slice(startIndex).filter((c) => c.can_listen);
        if (!playable.length) return;
        const tracks: Track[] = playable.map((c) => ({
          id: c.uuid ?? String(c.id),
          url: `${API_URL}/books/${c.book_uuid}/chapter/${c.uuid}`,
          title: c.title_dv || c.title_en || c.name_dv,
          artist: c.artist_dv || c.artist_en || '',
          album: c.name_dv || c.name_en || '',
          artwork: c.cover,
          duration: c.duration,
          headers: { Authorization: `Bearer ${token}` },
          // custom fields kept on the track object
          title_dv: c.title_dv,
          artist_dv: c.artist_dv,
          album_dv: c.name_dv,
          book_uuid: c.book_uuid,
          chapter_uuid: c.uuid,
        }));
        await TrackPlayer.reset();
        // v2 added tracks inside an un-awaited map (random order); add them as one ordered batch.
        await TrackPlayer.add(tracks);
        await TrackPlayer.setRate(rate);
        await TrackPlayer.play();
      } catch (e) {
        console.warn('Failed to play chapters', e);
        toast('އޯޑިއޯ ޕްލޭ ނުކުރެވުނު، އަލުން މަސައްކަތްކޮށްލައްވާ', { kind: 'error' });
      }
    },
    [ensureReady, rate],
  );

  const toggle = useCallback(async () => {
    const state = (await TrackPlayer.getPlaybackState()).state;
    if (state === State.Playing || state === State.Buffering) await TrackPlayer.pause();
    else await TrackPlayer.play();
  }, []);

  const stop = useCallback(async () => {
    clearSleep();
    await TrackPlayer.reset();
  }, [clearSleep]);

  const setRate = useCallback((next: number) => {
    setRateState(next);
    TrackPlayer.setRate(next).catch(() => {});
  }, []);

  const setSleep = useCallback(
    (mode: 'off' | 'chapter' | number) => {
      if (sleepTimer.current) clearTimeout(sleepTimer.current);
      sleepTimer.current = null;
      if (mode === 'off') return setSleepState(null);
      if (mode === 'chapter') return setSleepState({ kind: 'chapter' });
      const ms = mode * 60 * 1000;
      setSleepState({ kind: 'minutes', endsAt: Date.now() + ms });
      sleepTimer.current = setTimeout(() => {
        TrackPlayer.pause().catch(() => {});
        setSleepState(null);
        sleepTimer.current = null;
      }, ms);
    },
    [],
  );

  useTrackPlayerEvents([Event.PlaybackActiveTrackChanged], (event: any) => {
    // "End of chapter" sleep: pause as soon as the next chapter starts.
    if (sleep?.kind === 'chapter' && event.lastTrack && event.track) {
      TrackPlayer.pause().catch(() => {});
      TrackPlayer.seekTo(0).catch(() => {});
      clearSleep();
    }
  });

  useEffect(() => () => {
    if (sleepTimer.current) clearTimeout(sleepTimer.current);
  }, []);

  const state = playback.state;
  const value = useMemo<AudioApi>(
    () => ({
      ready,
      activeTrack,
      activeBookUuid: ((activeTrack as any)?.book_uuid as string) ?? null,
      isPlaying: state === State.Playing,
      isBuffering: state === State.Buffering || state === State.Loading,
      rate,
      sleep,
      playChapters,
      toggle,
      stop,
      setRate,
      setSleep,
    }),
    [ready, activeTrack, state, rate, sleep, playChapters, toggle, stop, setRate, setSleep],
  );

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}
