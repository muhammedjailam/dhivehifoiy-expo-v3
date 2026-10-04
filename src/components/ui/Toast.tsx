import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Txt } from './Txt';
import { PressableScale } from './PressableScale';
import { radius, useShadow, useTheme } from '../../theme';

type ToastKind = 'info' | 'success' | 'error';
type ToastItem = { id: number; message: string; kind: ToastKind; action?: { label: string; onPress: () => void } };

type ToastApi = {
  show: (message: string, opts?: { kind?: ToastKind; action?: ToastItem['action']; duration?: number }) => void;
};

const ToastContext = createContext<ToastApi>({ show: () => {} });

let externalShow: ToastApi['show'] | null = null;
/** Imperative toast for non-React code (download manager, api errors). */
export const toast: ToastApi['show'] = (message, opts) => externalShow?.(message, opts);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const show = useCallback<ToastApi['show']>((message, opts = {}) => {
    const id = ++counter.current;
    const kind = opts.kind ?? 'info';
    if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (kind === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    setItems((prev) => [...prev.slice(-2), { id, message, kind, action: opts.action }]);
    setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), opts.duration ?? (opts.action ? 4500 : 2600));
  }, []);

  useEffect(() => {
    externalShow = show;
    return () => {
      externalShow = null;
    };
  }, [show]);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastStack items={items} onDismiss={(id) => setItems((prev) => prev.filter((i) => i.id !== id))} />
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

function ToastStack({ items, onDismiss }: { items: ToastItem[]; onDismiss: (id: number) => void }) {
  const insets = useSafeAreaInsets();
  const t = useTheme();
  const shadow = useShadow(3);
  if (!items.length) return null;

  return (
    <View pointerEvents="box-none" style={[styles.stack, { top: insets.top + 8 }]}>
      {items.map((item) => {
        const icon = item.kind === 'success' ? 'checkmark-circle' : item.kind === 'error' ? 'alert-circle' : 'information-circle';
        const iconColor = item.kind === 'success' ? t.success : item.kind === 'error' ? t.danger : t.primary;
        return (
          <Animated.View
            key={item.id}
            entering={FadeInUp.springify().damping(18)}
            exiting={FadeOutUp.duration(180)}
            layout={LinearTransition.springify().damping(20)}
            style={[styles.toast, { backgroundColor: t.elevated, borderColor: t.border }, shadow]}
          >
            <PressableScale style={styles.row} onPress={() => onDismiss(item.id)}>
              <Ionicons name={icon} size={22} color={iconColor} />
              <Txt variant="bodySmall" style={{ flex: 1 }}>
                {item.message}
              </Txt>
              {item.action && (
                <PressableScale
                  onPress={() => {
                    item.action?.onPress();
                    onDismiss(item.id);
                  }}
                  style={[styles.action, { backgroundColor: t.primarySoft }]}
                >
                  <Txt variant="label" tone="primary">
                    {item.action.label}
                  </Txt>
                </PressableScale>
              )}
            </PressableScale>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { position: 'absolute', left: 16, right: 16, gap: 8, alignItems: 'stretch' },
  toast: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, alignSelf: 'center', maxWidth: 520, width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  action: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.pill },
});
