import React, { createContext, useCallback, useContext, useEffect, useId, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemeScope, useTheme } from '../../theme';

type PortalApi = {
  mount: (key: string, node: React.ReactNode) => void;
  unmount: (key: string) => void;
};

const PortalContext = createContext<PortalApi | null>(null);

/**
 * Renders overlays (sheets, dialogs) in the root window, above tabs and the mini player,
 * while keeping keyboard + gesture handling in the main window (more reliable than <Modal>).
 */
export function PortalHost({ children }: { children: React.ReactNode }) {
  const [nodes, setNodes] = useState<Record<string, React.ReactNode>>({});

  const mount = useCallback((key: string, node: React.ReactNode) => {
    setNodes((prev) => ({ ...prev, [key]: node }));
  }, []);

  const unmount = useCallback((key: string) => {
    setNodes((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const api = useMemo(() => ({ mount, unmount }), [mount, unmount]);

  return (
    <PortalContext.Provider value={api}>
      {children}
      {Object.entries(nodes).map(([key, node]) => (
        <View key={key} style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {node}
        </View>
      ))}
    </PortalContext.Provider>
  );
}

/**
 * Note: content is delivered to the host one render late, so keep fast-changing state
 * (e.g. TextInput values) inside components rendered *within* the portal content.
 */
export function Portal({ children }: { children: React.ReactNode }) {
  const api = useContext(PortalContext);
  const theme = useTheme();
  const key = useId();

  useEffect(() => {
    api?.mount(key, <ThemeScope value={theme}>{children}</ThemeScope>);
  }, [api, key, children, theme]);

  useEffect(() => () => api?.unmount(key), [api, key]);

  return null;
}
