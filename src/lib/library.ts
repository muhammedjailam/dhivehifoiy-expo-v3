import { createPersistedStore } from './store';
import type { Book } from '../types';

/**
 * Local-only reading data: progress, bookmarks and recently opened books.
 * Never leaves the device.
 */

export type BookMeta = {
  uuid: string;
  slug: string;
  name_dv: string;
  thumb: string;
  author_name?: string | null;
  can_print?: boolean;
  can_listen?: boolean;
};

export type ReadingProgress = { page: number; total: number; updatedAt: number };

export type Bookmark = {
  id: string;
  page: number;
  note?: string;
  createdAt: number;
};

type LibraryState = {
  books: Record<string, BookMeta>;
  progress: Record<string, ReadingProgress>;
  bookmarks: Record<string, Bookmark[]>;
  /** Most recently opened first */
  history: string[];
};

export const libraryStore = createPersistedStore<LibraryState>('library.v1', {
  books: {},
  progress: {},
  bookmarks: {},
  history: [],
});

const EMPTY: Bookmark[] = [];

export const useBookmarks = (uuid: string) => libraryStore.use((s) => s.bookmarks[uuid] ?? EMPTY);
export const useAllBookmarks = () => libraryStore.use((s) => s.bookmarks);
export const useProgress = (uuid: string) => libraryStore.use((s) => s.progress[uuid]);
export const useProgressMap = () => libraryStore.use((s) => s.progress);
export const useLibraryBooks = () => libraryStore.use((s) => s.books);
export const useHistory = () => libraryStore.use((s) => s.history);

export function metaFromBook(book: Book): BookMeta {
  return {
    uuid: book.uuid,
    slug: book.slug,
    name_dv: book.name_dv,
    thumb: book.thumb,
    author_name: book.author_name,
    can_print: !!book.can_print,
    can_listen: !!book.can_listen,
  };
}

export function rememberBook(meta: BookMeta, addToHistory = true) {
  libraryStore.set((s) => ({
    ...s,
    books: { ...s.books, [meta.uuid]: { ...s.books[meta.uuid], ...meta } },
    history: addToHistory ? [meta.uuid, ...s.history.filter((u) => u !== meta.uuid)].slice(0, 24) : s.history,
  }));
}

export function removeFromHistory(uuid: string) {
  libraryStore.set((s) => ({ ...s, history: s.history.filter((u) => u !== uuid) }));
}

export function saveProgress(uuid: string, page: number, total: number) {
  const prev = libraryStore.get().progress[uuid];
  if (prev && prev.page === page && prev.total === total) return;
  libraryStore.set((s) => ({
    ...s,
    progress: { ...s.progress, [uuid]: { page, total, updatedAt: Date.now() } },
  }));
}

export function addBookmark(uuid: string, page: number, note?: string): Bookmark {
  const bookmark: Bookmark = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    page,
    note: note?.trim() || undefined,
    createdAt: Date.now(),
  };
  libraryStore.set((s) => {
    const list = (s.bookmarks[uuid] ?? []).filter((b) => b.page !== page);
    return {
      ...s,
      bookmarks: { ...s.bookmarks, [uuid]: [...list, bookmark].sort((a, b) => a.page - b.page) },
    };
  });
  return bookmark;
}

export function updateBookmarkNote(uuid: string, id: string, note: string) {
  libraryStore.set((s) => ({
    ...s,
    bookmarks: {
      ...s.bookmarks,
      [uuid]: (s.bookmarks[uuid] ?? []).map((b) => (b.id === id ? { ...b, note: note.trim() || undefined } : b)),
    },
  }));
}

export function removeBookmark(uuid: string, id: string) {
  libraryStore.set((s) => {
    const next = (s.bookmarks[uuid] ?? []).filter((b) => b.id !== id);
    const bookmarks = { ...s.bookmarks };
    if (next.length) bookmarks[uuid] = next;
    else delete bookmarks[uuid];
    return { ...s, bookmarks };
  });
}

export function toggleBookmark(uuid: string, page: number): boolean {
  const existing = (libraryStore.get().bookmarks[uuid] ?? []).find((b) => b.page === page);
  if (existing) {
    removeBookmark(uuid, existing.id);
    return false;
  }
  addBookmark(uuid, page);
  return true;
}

export function clearLibraryData() {
  libraryStore.reset();
}
