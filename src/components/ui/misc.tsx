import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNetInfo } from '@react-native-community/netinfo';
import { Txt } from './Txt';
import { PressableScale } from './PressableScale';
import { Button } from './Button';
import { forwardIcon, radius, useTheme } from '../../theme';
import type { IconName } from './IconButton';

/* ---------------- Empty / error states ---------------- */

export function EmptyState({
  icon = 'book-outline',
  title,
  message,
  actionLabel,
  onAction,
  style,
}: {
  icon?: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={[styles.empty, style]}>
      <View style={[styles.emptyIcon, { backgroundColor: t.primarySoft }]}>
        <Ionicons name={icon} size={34} color={t.primary} />
      </View>
      <Txt variant="heading" center>
        {title}
      </Txt>
      {!!message && (
        <Txt variant="bodySmall" tone="muted" center style={{ maxWidth: 300 }}>
          {message}
        </Txt>
      )}
      {!!actionLabel && <Button title={actionLabel} onPress={onAction} variant="secondary" size="sm" style={{ marginTop: 8 }} />}
    </Animated.View>
  );
}

export function LoadingView({ label }: { label?: string }) {
  const t = useTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={t.primary} />
      {!!label && (
        <Txt variant="caption" tone="muted" style={{ marginTop: 8 }}>
          {label}
        </Txt>
      )}
    </View>
  );
}

/* ---------------- Section heading ---------------- */

export function SectionHeading({ title, actionLabel = 'ހުރިހާ', onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  const t = useTheme();
  return (
    <View style={styles.sectionHeading}>
      <Txt variant="heading" style={{ flex: 1 }} numberOfLines={1}>
        {title}
      </Txt>
      {onAction && (
        <PressableScale onPress={onAction} hitSlop={10} style={styles.sectionAction}>
          <Txt variant="label" tone="primary">
            {actionLabel}
          </Txt>
          <Ionicons name={forwardIcon() as IconName} size={14} color={t.primary} />
        </PressableScale>
      )}
    </View>
  );
}

/* ---------------- Chip ---------------- */

export function Chip({
  label,
  icon,
  onPress,
  selected,
  style,
}: {
  label: string;
  icon?: IconName;
  onPress?: () => void;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      disabled={!onPress}
      haptic={!!onPress}
      style={[
        styles.chip,
        { backgroundColor: selected ? t.primary : t.surfaceAlt, borderColor: selected ? t.primary : t.border },
        style,
      ]}
    >
      {icon && <Ionicons name={icon} size={14} color={selected ? t.onPrimary : t.textMuted} />}
      <Txt variant="caption" color={selected ? t.onPrimary : t.text} numberOfLines={1}>
        {label}
      </Txt>
    </PressableScale>
  );
}

/* ---------------- Segmented control ---------------- */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { value: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (v: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: t.surfaceAlt }, style]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <PressableScale key={o.value} haptic onPress={() => onChange(o.value)} style={styles.segment} scaleTo={0.97}>
            {active && (
              <Animated.View
                entering={FadeIn.duration(180)}
                exiting={FadeOut.duration(120)}
                style={[StyleSheet.absoluteFill, styles.segmentActive, { backgroundColor: t.elevated, shadowColor: t.shadow }]}
              />
            )}
            {o.icon && <Ionicons name={o.icon} size={15} color={active ? t.primary : t.textMuted} />}
            <Txt variant="label" color={active ? t.text : t.textMuted} numberOfLines={1}>
              {o.label}
            </Txt>
          </PressableScale>
        );
      })}
    </View>
  );
}

/* ---------------- Progress ---------------- */

export function ProgressBar({ value, height = 4, color, track, style }: { value: number; height?: number; color?: string; track?: string; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withSpring(Math.max(0, Math.min(1, value)), { damping: 20, stiffness: 120 });
  }, [value, width]);
  const animated = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));
  return (
    <View style={[{ height, borderRadius: height, backgroundColor: track ?? t.surfaceAlt, overflow: 'hidden' }, style]}>
      <Animated.View style={[{ height, borderRadius: height, backgroundColor: color ?? t.primary }, animated]} />
    </View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function ProgressRing({ value, size = 28, stroke = 3, color, track }: { value: number; size?: number; stroke?: number; color?: string; track?: string }) {
  const t = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(Math.max(0, Math.min(1, value)), { duration: 200 });
  }, [value, progress]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - progress.value) }));
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={track ?? t.surfaceAlt} strokeWidth={stroke} fill="none" />
      <AnimatedCircle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color ?? t.primary}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${c} ${c}`}
        strokeLinecap="round"
        animatedProps={props}
      />
    </Svg>
  );
}

/* ---------------- Offline banner ---------------- */

export function useIsOffline() {
  const net = useNetInfo();
  return net.isConnected === false || net.isInternetReachable === false;
}

export function OfflineBanner({ style }: { style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const offline = useIsOffline();
  const [show, setShow] = useState(false);
  useEffect(() => {
    // Debounce brief connectivity blips.
    const id = setTimeout(() => setShow(offline), offline ? 600 : 0);
    return () => clearTimeout(id);
  }, [offline]);
  if (!show) return null;
  return (
    <Animated.View entering={FadeInDown} exiting={FadeOut} style={[styles.offline, { backgroundColor: t.surfaceAlt, borderColor: t.border }, style]}>
      <Ionicons name="cloud-offline-outline" size={18} color={t.textMuted} />
      <Txt variant="caption" tone="muted" style={{ flex: 1 }}>
        އޮފްލައިން — ޑައުންލޯޑްކޮށްފައިވާ ފޮތްތައް ކިޔޭނެ
      </Txt>
    </Animated.View>
  );
}

/* ---------------- List row ---------------- */

export function ListRow({
  icon,
  title,
  subtitle,
  onPress,
  right,
  destructive,
  loading,
  chevron = true,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  destructive?: boolean;
  loading?: boolean;
  chevron?: boolean;
}) {
  const t = useTheme();
  const color = destructive ? t.danger : t.text;
  return (
    <PressableScale onPress={onPress} disabled={!onPress || loading} scaleTo={0.98} style={styles.listRow}>
      {icon && (
        <View style={[styles.listIcon, { backgroundColor: destructive ? t.dangerSoft : t.primarySoft }]}>
          <Ionicons name={icon} size={19} color={destructive ? t.danger : t.primary} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Txt variant="subheading" color={color} numberOfLines={1}>
          {title}
        </Txt>
        {!!subtitle && (
          <Txt variant="caption" tone="muted" numberOfLines={2}>
            {subtitle}
          </Txt>
        )}
      </View>
      {loading ? (
        <ActivityIndicator color={t.textMuted} />
      ) : (
        right ?? (chevron && onPress ? <Ionicons name={forwardIcon() as IconName} size={18} color={t.textFaint} /> : null)
      )}
    </PressableScale>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }, style]}>{children}</View>;
}

export function Divider({ inset = 0 }: { inset?: number }) {
  const t = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.border, marginStart: inset }} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  empty: { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 6 },
  emptyIcon: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 4, paddingStart: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  segmented: { flexDirection: 'row', padding: 3, borderRadius: radius.md, gap: 2 },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: radius.md - 3,
  },
  segmentActive: {
    borderRadius: radius.md - 3,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  offline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, minHeight: 56 },
  listIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
});
