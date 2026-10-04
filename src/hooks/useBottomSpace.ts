import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MINI_PLAYER_HEIGHT, TAB_BAR_HEIGHT, useMiniPlayerVisible } from '../audio/MiniPlayer';

/** Scroll content bottom padding that clears the floating tab bar and mini player. */
export function useBottomSpace(inTabs: boolean) {
  const insets = useSafeAreaInsets();
  const mini = useMiniPlayerVisible();
  return insets.bottom + 24 + (inTabs ? TAB_BAR_HEIGHT + 8 : 0) + (mini ? MINI_PLAYER_HEIGHT + 8 : 0);
}
