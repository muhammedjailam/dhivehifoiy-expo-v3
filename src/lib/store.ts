import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

type Updater<T> = T | ((prev: T) => T);

export type PersistedStore<T extends object> = {
  get: () => T;
  set: (updater: Updater<T>) => void;
  subscribe: (listener: () => void) => () => void;
  /** Selector must return a stable reference (a slice of state or a primitive). */
  use: <S>(selector: (state: T) => S) => S;
  flush: () => void;
  reset: () => void;
};

/**
 * Tiny synchronous, persisted, reactive store backed by expo-sqlite's kv-store.
 * Writes are coalesced so rapid updates (e.g. page changes while reading) stay cheap.
 */
export function createPersistedStore<T extends object>(key: string, initial: T): PersistedStore<T> {
  let state: T = initial;
  try {
    const raw = Storage.getItemSync(key);
    if (raw) state = { ...initial, ...JSON.parse(raw) };
  } catch {
    state = initial;
  }

  const listeners = new Set<() => void>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const persist = () => {
    timer = null;
    try {
      Storage.setItemSync(key, JSON.stringify(state));
    } catch (e) {
      console.warn(`[store:${key}] persist failed`, e);
    }
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  return {
    get: () => state,
    set(updater) {
      const next = typeof updater === 'function' ? (updater as (p: T) => T)(state) : updater;
      if (next === state) return;
      state = next;
      listeners.forEach((l) => l());
      if (!timer) timer = setTimeout(persist, 200);
    },
    subscribe,
    use: (selector) =>
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useSyncExternalStore(subscribe, () => selector(state)),
    flush() {
      if (timer) clearTimeout(timer);
      persist();
    },
    reset() {
      state = initial;
      listeners.forEach((l) => l());
      if (timer) clearTimeout(timer);
      persist();
    },
  };
}
