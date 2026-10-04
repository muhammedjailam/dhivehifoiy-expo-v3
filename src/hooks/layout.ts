import { useWindowDimensions } from 'react-native';

/** Responsive grid sizing that adapts to rotation and tablets (replaces v2's orientation listeners). */
export function useGrid(minItemWidth = 150, padding = 16, gap = 16) {
  const { width } = useWindowDimensions();
  const usable = width - padding * 2;
  const columns = Math.max(2, Math.floor((usable + gap) / (minItemWidth + gap)));
  const itemWidth = Math.floor((usable - gap * (columns - 1)) / columns);
  return { columns, itemWidth, gap, padding };
}

/** Bottom padding so content clears the floating tab bar (+ mini player when visible). */
export const TAB_BAR_SPACE = 110;
