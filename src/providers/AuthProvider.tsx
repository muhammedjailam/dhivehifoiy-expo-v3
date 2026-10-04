import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import TrackPlayer from 'react-native-track-player';
import { api, clearSession, hasToken, setToken, setUnauthorizedHandler, socialLogin } from '../lib/api';
import { CLIENT_ID, CLIENT_SECRET } from '../config';
import { downloadedUuids, wipeAllDownloads } from '../lib/downloads';
import { clearLibraryData, libraryStore } from '../lib/library';
import { deleteReaderKey } from '../lib/reader';
import { settingsStore } from '../lib/settings';
import { initializeNotifications } from '../lib/notifications';
import type { Customer } from '../types';

type Status = 'loading' | 'signedIn' | 'signedOut';

type AuthApi = {
  status: Status;
  signIn: (provider: 'google' | 'apple', token: string) => Promise<void>;
  /** Explicit logout: also removes downloads, bookmarks and reading history from this device. */
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthApi>({
  status: 'loading',
  signIn: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

async function wipeLocalReadingData() {
  const { books, history } = libraryStore.get();
  const uuids = new Set([...Object.keys(books), ...history, ...downloadedUuids()]);
  await Promise.all([...uuids].map((u) => deleteReaderKey(u)));
  await wipeAllDownloads();
  clearLibraryData();
  settingsStore.set((s) => ({ ...s, downloadsOwner: null, recentSearches: [], pushRegistered: false }));
}

/** Downloads are bound to the account that made them; a different account starts clean. */
async function bindDownloadsToCustomer() {
  try {
    const profile = await api.get<Customer>('/customers/profile');
    const owner = settingsStore.get().downloadsOwner;
    if (owner && profile?.id && owner !== profile.id) {
      await wipeLocalReadingData();
    }
    if (profile?.id) settingsStore.set((s) => ({ ...s, downloadsOwner: profile.id }));
  } catch {
    // offline – keep everything as is
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const queryClient = useQueryClient();
  const loggingOut = useRef(false);

  useEffect(() => {
    hasToken().then((ok) => {
      setStatus(ok ? 'signedIn' : 'signedOut');
      if (ok) {
        bindDownloadsToCustomer();
        // Users upgrading from v2 are already signed in: register this install for pushes once.
        if (!settingsStore.get().pushRegistered) {
          initializeNotifications().then((registered) => {
            if (registered) settingsStore.set((s) => ({ ...s, pushRegistered: true }));
          });
        }
      }
    });
  }, []);

  const endSession = useCallback(
    async (wipe: boolean) => {
      if (loggingOut.current) return;
      loggingOut.current = true;
      try {
        await TrackPlayer.reset().catch(() => {});
        await clearSession();
        if (wipe) await wipeLocalReadingData();
        queryClient.clear();
      } finally {
        setStatus('signedOut');
        loggingOut.current = false;
        router.replace('/');
      }
    },
    [queryClient],
  );

  useEffect(() => {
    // Token expired or revoked (same behaviour as v2: clear session, back to sign in).
    setUnauthorizedHandler(() => endSession(false));
    return () => setUnauthorizedHandler(null);
  }, [endSession]);

  const signIn = useCallback(async (provider: 'google' | 'apple', token: string) => {
    const accessToken = await socialLogin(provider, token, CLIENT_ID, CLIENT_SECRET);
    await setToken(accessToken);
    await bindDownloadsToCustomer();
    setStatus('signedIn');
    initializeNotifications().then((registered) => {
      if (registered) settingsStore.set((s) => ({ ...s, pushRegistered: true }));
    });
  }, []);

  const signOut = useCallback(() => endSession(true), [endSession]);

  const value = useMemo(() => ({ status, signIn, signOut }), [status, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
