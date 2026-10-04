import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Portal } from './Portal';
import { Txt } from './Txt';
import { IconButton } from './IconButton';
import { radius, useTheme } from '../../theme';

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Wrap children in a ScrollView (default true). */
  scroll?: boolean;
  maxHeightRatio?: number;
  contentStyle?: StyleProp<ViewStyle>;
  headerRight?: React.ReactNode;
};

/** Native-feeling bottom sheet: spring in, drag to dismiss, keyboard aware, back-button aware. */
export function Sheet(props: SheetProps) {
  const [mounted, setMounted] = useState(props.visible);
  const handleClosed = useCallback(() => setMounted(false), []);

  useEffect(() => {
    if (props.visible) setMounted(true);
  }, [props.visible]);

  if (!mounted) return null;
  return (
    <Portal>
      <SheetBody {...props} onClosed={handleClosed} />
    </Portal>
  );
}

function SheetBody({
  visible,
  onClose,
  onClosed,
  title,
  subtitle,
  children,
  scroll = true,
  maxHeightRatio = 0.86,
  contentStyle,
  headerRight,
}: SheetProps & { onClosed: () => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const progress = useSharedValue(0);
  const drag = useSharedValue(0);
  const keyboard = useAnimatedKeyboard();

  useEffect(() => {
    if (visible) {
      drag.value = 0;
      progress.value = withSpring(1, { damping: 24, stiffness: 260, mass: 0.9 });
    } else {
      progress.value = withTiming(0, { duration: 220, easing: Easing.in(Easing.quad) }, (finished) => {
        if (finished) runOnJS(onClosed)();
      });
    }
  }, [visible, progress, drag, onClosed]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const pan = Gesture.Pan()
    .activeOffsetY(8)
    .onUpdate((e) => {
      drag.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 110 || e.velocityY > 900) {
        runOnJS(onClose)();
      } else {
        drag.value = withSpring(0, { damping: 20, stiffness: 300 });
      }
    });

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.value, [0, 1], [height, 0]) + drag.value - keyboard.height.value }],
  }));

  const Body = scroll ? ScrollView : View;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: t.overlay }, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="close" />
      </Animated.View>
      <Animated.View
        style={[
          styles.panel,
          { backgroundColor: t.elevated, maxHeight: height * maxHeightRatio, paddingBottom: Math.max(insets.bottom, 16) },
          panelStyle,
        ]}
      >
        <GestureDetector gesture={pan}>
          <View style={styles.header}>
            <View style={[styles.grabber, { backgroundColor: t.border }]} />
            {(title || headerRight) && (
              <View style={styles.titleRow}>
                <View style={{ flex: 1 }}>
                  {title && <Txt variant="heading">{title}</Txt>}
                  {subtitle && (
                    <Txt variant="caption" tone="muted">
                      {subtitle}
                    </Txt>
                  )}
                </View>
                {headerRight}
                <IconButton name="close" size={20} variant="tonal" onPress={onClose} accessibilityLabel="close" />
              </View>
            )}
          </View>
        </GestureDetector>
        <Body
          style={{ flexGrow: 0 }}
          contentContainerStyle={scroll ? [styles.content, contentStyle] : undefined}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {scroll ? children : <View style={[styles.content, contentStyle]}>{children}</View>}
        </Body>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
  },
  header: { paddingTop: 8, paddingHorizontal: 16 },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 4 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
});
