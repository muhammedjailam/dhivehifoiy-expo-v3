import { useSyncExternalStore } from 'react';
import { File, Paths } from 'expo-file-system';
import { createPersistedStore } from './store';
import { getToken } from './api';
import { readUrl, saveReaderKey, type ReaderTarget } from './reader';
import type { BookMeta } from './library';
import {
  deleteQuietly,
  destroyVaultKey,
  encryptIntoVault,
  looksLikePdf,
  newTempFile,
  removeFromVault,
  vaultDir,
  vaultFile,
  vaultKeyState,
  wipeVault,
} from './vault';

export type DownloadRecord = BookMeta & {
  size: number;
  downloadedAt: number;
  hasLocalThumb: boolean;
};

export type JobPhase = 'queued' | 'downloading' | 'securing' | 'error';
export type DownloadJob = { phase: JobPhase; progress: number; error?: string; name_dv: string };

type DownloadEvent = { type: 'done' | 'error'; uuid: string; name_dv: string; message?: string };

const recordsStore = createPersistedStore<{ records: Record<string, DownloadRecord> }>('downloads.v1', { records: {} });

export const useDownloads = () => recordsStore.use((s) => s.records);
export const useDownloadRecord = (uuid: string) => recordsStore.use((s) => s.records[uuid]);
export const getDownloadRecord = (uuid: string) => recordsStore.get().records[uuid];
export const isDownloaded = (uuid: string) => !!recordsStore.get().records[uuid];
export const downloadedUuids = () => Object.keys(recordsStore.get().records);

/* ---------- transient job state ---------- */

let jobs: Record<string, DownloadJob> = {};
const jobListeners = new Set<() => void>();
const eventListeners = new Set<(e: DownloadEvent) => void>();

const subscribeJobs = (l: () => void) => {
  jobListeners.add(l);
  return () => {
    jobListeners.delete(l);
  };
};

function setJob(uuid: string, job: DownloadJob | null) {
  const next = { ...jobs };
  if (job) next[uuid] = job;
  else delete next[uuid];
  jobs = next;
  jobListeners.forEach((l) => l());
}

export const useDownloadJob = (uuid: string) => useSyncExternalStore(subscribeJobs, () => jobs[uuid]);
export const useDownloadJobs = () => useSyncExternalStore(subscribeJobs, () => jobs);

export function onDownloadEvent(listener: (e: DownloadEvent) => void) {
  eventListeners.add(listener);
  return () => {
    eventListeners.delete(listener);
  };
}
const emit = (e: DownloadEvent) => eventListeners.forEach((l) => l(e));

/* ---------- queue ---------- */

type QueuedJob = { target: ReaderTarget; gen: number };

const queue: QueuedJob[] = [];
const controllers: Record<string, AbortController> = {};
/**
 * Latest generation per book. Cancel/delete/wipe bump it, so a job that is still
 * winding down can never overwrite newer state or save a record after it was cancelled.
 */
const generation: Record<string, number> = {};
let genCounter = 0;
let running = false;

const isCurrent = (uuid: string, gen: number) => generation[uuid] === gen;
const invalidate = (uuid: string) => {
  generation[uuid] = ++genCounter;
};

export function startDownload(target: ReaderTarget) {
  const existing = jobs[target.uuid];
  if (isDownloaded(target.uuid) || (existing && existing.phase !== 'error')) return;
  const gen = ++genCounter;
  generation[target.uuid] = gen;
  setJob(target.uuid, { phase: 'queued', progress: 0, name_dv: target.name_dv });
  queue.push({ target, gen });
  pump();
}

async function pump() {
  if (running) return;
  const next = queue.shift();
  if (!next) return;
  running = true;
  try {
    if (isCurrent(next.target.uuid, next.gen)) await runJob(next.target, next.gen);
  } finally {
    running = false;
    pump();
  }
}

class UserCancelled extends Error {}
class NoSpace extends Error {}

async function runJob(target: ReaderTarget, gen: number) {
  const { uuid, idB64, name_dv } = target;
  const controller = new AbortController();
  controllers[uuid] = controller;
  const tmp = newTempFile('dl', 'bin');
  let noSpace = false;
  const update = (job: DownloadJob | null) => {
    if (isCurrent(uuid, gen)) setJob(uuid, job);
  };
  const ensureLive = () => {
    if (noSpace) throw new NoSpace();
    if (controller.signal.aborted || !isCurrent(uuid, gen)) throw new UserCancelled();
  };

  try {
    const token = await getToken();
    ensureLive();
    update({ phase: 'downloading', progress: 0, name_dv });

    let lastEmit = 0;
    let checkedSpace = false;
    await File.downloadFileAsync(readUrl(uuid, idB64), tmp, {
      headers: { Authorization: `Bearer ${token}` },
      idempotent: true,
      signal: controller.signal,
      onProgress: ({ bytesWritten, totalBytes }) => {
        if (!checkedSpace && totalBytes > 0) {
          checkedSpace = true;
          // Need room for the download plus its encrypted copy.
          if (Paths.availableDiskSpace < totalBytes * 2.2) {
            noSpace = true;
            controller.abort();
            return;
          }
        }
        const now = Date.now();
        if (now - lastEmit < 120) return;
        lastEmit = now;
        update({ phase: 'downloading', progress: totalBytes > 0 ? bytesWritten / totalBytes : 0, name_dv });
      },
    });

    ensureLive();
    if (!looksLikePdf(tmp)) throw new Error('Invalid file received');

    update({ phase: 'securing', progress: 0, name_dv });
    let lastSecureEmit = 0;
    const size = await encryptIntoVault(
      tmp,
      uuid,
      (p) => {
        const now = Date.now();
        if (now - lastSecureEmit < 120 && p < 1) return;
        lastSecureEmit = now;
        update({ phase: 'securing', progress: p, name_dv });
      },
      controller.signal,
    );
    deleteQuietly(tmp);
    ensureLive();

    let hasLocalThumb = false;
    if (target.thumb) {
      try {
        await File.downloadFileAsync(target.thumb, new File(vaultDir(), `${uuid}.jpg`), {
          idempotent: true,
          signal: controller.signal,
        });
        hasLocalThumb = true;
      } catch {}
    }

    ensureLive();
    await saveReaderKey(uuid, idB64);
    ensureLive();
    const { idB64: _secret, ...meta } = target;
    recordsStore.set((s) => ({
      records: { ...s.records, [uuid]: { ...meta, size, downloadedAt: Date.now(), hasLocalThumb } },
    }));
    update(null);
    emit({ type: 'done', uuid, name_dv });
  } catch (e) {
    // Only clean the vault entry if no newer job/record owns it.
    if (isCurrent(uuid, gen) || !isDownloaded(uuid)) removeFromVault(uuid);
    if (noSpace || e instanceof NoSpace) {
      update({ phase: 'error', progress: 0, name_dv, error: 'ފޯނުގައި ޖާގަ ނުހުރެއެވެ' });
      emit({ type: 'error', uuid, name_dv, message: 'ފޯނުގައި ޖާގަ ނުހުރެއެވެ' });
    } else if (controller.signal.aborted || e instanceof UserCancelled || !isCurrent(uuid, gen)) {
      update(null);
    } else {
      console.warn('[downloads] failed', e);
      update({ phase: 'error', progress: 0, name_dv, error: 'ޑައުންލޯޑް ނުކުރެވުނު' });
      emit({ type: 'error', uuid, name_dv, message: 'ޑައުންލޯޑް ނުކުރެވުނު' });
    }
  } finally {
    deleteQuietly(tmp);
    if (controllers[uuid] === controller) delete controllers[uuid];
  }
}

export function cancelDownload(uuid: string) {
  for (let i = queue.length - 1; i >= 0; i--) if (queue[i].target.uuid === uuid) queue.splice(i, 1);
  invalidate(uuid);
  controllers[uuid]?.abort();
  setJob(uuid, null);
}

export function dismissDownloadError(uuid: string) {
  if (jobs[uuid]?.phase === 'error') setJob(uuid, null);
}

export function deleteDownload(uuid: string) {
  cancelDownload(uuid);
  removeFromVault(uuid);
  recordsStore.set((s) => {
    const records = { ...s.records };
    delete records[uuid];
    return { records };
  });
}

export async function wipeAllDownloads() {
  queue.splice(0, queue.length);
  Object.keys(generation).forEach(invalidate);
  Object.keys(controllers).forEach(invalidate);
  Object.values(controllers).forEach((c) => c.abort());
  jobs = {};
  jobListeners.forEach((l) => l());
  wipeVault();
  recordsStore.reset();
  await destroyVaultKey();
}

export const localThumbUri = (uuid: string) => new File(vaultDir(), `${uuid}.jpg`).uri;

/** Reconciles records with the files on disk. Call once at startup. */
export async function reconcileDownloads() {
  const records = recordsStore.get().records;
  const uuids = Object.keys(records);
  if (!uuids.length) return;
  const keyState = await vaultKeyState();
  // Keychain unreadable (e.g. launched in background while locked) – never wipe on uncertainty.
  if (keyState === 'unknown') return;
  if (keyState === 'missing') {
    // Key genuinely lost (reinstall / restore) – encrypted files are unrecoverable.
    wipeVault();
    recordsStore.reset();
    return;
  }
  const missing = uuids.filter((u) => !vaultFile(u).exists);
  if (missing.length) {
    recordsStore.set((s) => {
      const next = { ...s.records };
      missing.forEach((u) => delete next[u]);
      return { records: next };
    });
  }
}

export function totalDownloadedBytes(records: Record<string, DownloadRecord>) {
  return Object.values(records).reduce((sum, r) => sum + (r.size || 0), 0);
}
