import TrackPlayer, { Event } from 'react-native-track-player';

/** Background playback service (lock screen / notification controls). */
export default async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.reset());
  TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());
  TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious());
  TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }) => TrackPlayer.seekTo(position));
  TrackPlayer.addEventListener(Event.RemoteJumpForward, ({ interval }) => TrackPlayer.seekBy(interval ?? 15));
  TrackPlayer.addEventListener(Event.RemoteJumpBackward, ({ interval }) => TrackPlayer.seekBy(-(interval ?? 15)));
}
