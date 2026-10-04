import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { API_URL } from '../config';
import { rememberBook, type BookMeta } from './library';
import type { Book } from '../types';

/**
 * Helpers that reproduce v2's protected PDF access scheme:
 *  - `id` route param = base64(purchase_id) (or base64(uuid) for previews)
 *  - stream URL      = /books/read/{uuid}.pdf?id={simpleHash(id)}
 *  - PDF password    = atob(id) + uuid
 */

export function simpleHash(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash = hash & hash;
  }
  return hash;
}

export const toB64 = (value: string) => btoa(value);
export const fromB64 = (value: string) => {
  try {
    return atob(value);
  } catch {
    return '';
  }
};

export const readUrl = (uuid: string, idB64: string) => `${API_URL}/books/read/${uuid}.pdf?id=${simpleHash(idB64)}`;
export const printUrl = (uuid: string, idB64: string) => `${API_URL}/books/print/${uuid}.pdf?id=${simpleHash(idB64)}`;
export const pdfPassword = (uuid: string, idB64: string) => fromB64(idB64) + uuid;
export const isPreviewKey = (uuid: string, idB64: string) => fromB64(idB64) === uuid;

const SECURE_OPTS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

const keyName = (uuid: string) => `rk.${uuid.replace(/[^A-Za-z0-9._-]/g, '')}`;

/** Remembers how to open an owned book so "continue reading" works from anywhere. */
export async function saveReaderKey(uuid: string, idB64: string) {
  try {
    await SecureStore.setItemAsync(keyName(uuid), idB64, SECURE_OPTS);
  } catch {}
}

export async function getReaderKey(uuid: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(keyName(uuid), SECURE_OPTS);
  } catch {
    return null;
  }
}

export async function deleteReaderKey(uuid: string) {
  try {
    await SecureStore.deleteItemAsync(keyName(uuid), SECURE_OPTS);
  } catch {}
}

export type ReaderTarget = BookMeta & { idB64: string };

export function readerTargetFromBook(book: Book, preview = false): ReaderTarget | null {
  const id = preview ? book.uuid : book.purchase_id;
  if (!id) return null;
  return {
    uuid: book.uuid,
    slug: book.slug,
    name_dv: book.name_dv,
    thumb: book.thumb,
    author_name: book.author_name,
    can_print: !!book.can_print,
    can_listen: !!book.can_listen,
    idB64: toB64(String(id)),
  };
}

export function openReader(target: ReaderTarget, opts: { replace?: boolean } = {}) {
  const preview = isPreviewKey(target.uuid, target.idB64);
  if (!preview) {
    rememberBook(target);
    saveReaderKey(target.uuid, target.idB64);
  }
  const href = {
    pathname: '/books/reader/[uuid]' as const,
    params: {
      uuid: target.uuid,
      id: target.idB64,
      thumb: target.thumb,
      name_dv: target.name_dv,
      slug: target.slug,
      printable: String(!!target.can_print),
      listenable: String(!!target.can_listen),
    },
  };
  if (opts.replace) router.replace(href);
  else router.push(href);
}

/** Opens a previously-read or downloaded book by uuid. Falls back to the store page. */
export async function openReaderByUuid(meta: BookMeta) {
  const idB64 = await getReaderKey(meta.uuid);
  if (idB64) {
    openReader({ ...meta, idB64 });
  } else {
    router.push({ pathname: '/books/[slug]', params: { slug: meta.slug } });
  }
}
