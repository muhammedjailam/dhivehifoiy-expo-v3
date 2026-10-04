import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { shuffle } from '../lib/format';
import type { Author, Book, Chapter, CmsPage, Customer, Genre, Magazine, Paginated, Slide } from '../types';

/* ---------- home ---------- */

export const useSlides = () =>
  useQuery({
    queryKey: ['slides'],
    queryFn: async () => shuffle((await api.get<Paginated<Slide>>('/slides')).data),
  });

export const useBookRail = (key: string, params: Record<string, any>, filters: Record<string, any> = {}, randomize = true) =>
  useQuery({
    queryKey: ['rail', key],
    queryFn: async () => {
      const res = await api.get<Paginated<Book>>('/books', { per_page: 12, ...params }, filters);
      return randomize ? shuffle(res.data) : res.data;
    },
  });

export const useMagazines = () =>
  useQuery({
    queryKey: ['magazines'],
    queryFn: async () => shuffle((await api.get<Magazine[]>('/magazines')).filter((m) => m.books?.length > 0)),
  });

export const useGenres = (perPage?: number) =>
  useQuery({
    queryKey: ['genres', perPage ?? 'all'],
    queryFn: async () => (await api.get<Paginated<Genre>>('/genres', perPage ? { per_page: perPage } : {})).data ?? [],
    staleTime: 30 * 60 * 1000,
  });

export const useAuthors = () =>
  useQuery({
    queryKey: ['authors'],
    queryFn: async () => shuffle(await api.get<Author[]>('/authors', { per_page: 50 }, { randomize: true })),
  });

/* ---------- lists ---------- */

type ListSource = { endpoint: string; params?: Record<string, any>; filters?: Record<string, any> };

/** Paginated book list driven by Laravel's next_page_url (same as v2). */
export function useBookList(key: unknown[], source: ListSource, enabled = true) {
  return useInfiniteQuery({
    queryKey: ['books', ...key],
    enabled,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      if (pageParam) return api.get<Paginated<Book>>(pageParam);
      return api.get<Paginated<Book>>(source.endpoint, { per_page: 12, ...source.params }, source.filters ?? {});
    },
    getNextPageParam: (last) => last?.next_page_url ?? null,
  });
}

/* ---------- details ---------- */

export const useBook = (slug?: string) =>
  useQuery({
    queryKey: ['book', slug],
    enabled: !!slug,
    queryFn: () => api.get<Book>(`/books/preview/${slug}`),
  });

export const useAuthor = (slug?: string) =>
  useQuery({
    queryKey: ['author', slug],
    enabled: !!slug,
    queryFn: () => api.get<Author>(`/authors/${slug}`),
  });

export const useChapters = (uuid?: string) =>
  useQuery({
    queryKey: ['chapters', uuid],
    enabled: !!uuid,
    queryFn: () => api.get<Chapter[]>(`/books/${uuid}/chapters`),
  });

export const usePage = (slug?: string) =>
  useQuery({
    queryKey: ['page', slug],
    enabled: !!slug,
    queryFn: () => api.get<CmsPage>(`/pages/${slug}`),
  });

export const usePages = () =>
  useQuery({
    queryKey: ['pages'],
    queryFn: async () => (await api.get<Paginated<CmsPage>>('/pages', { per_page: 50 }, { is_featured: 1 })).data ?? [],
    staleTime: 60 * 60 * 1000,
  });

/* ---------- account ---------- */

export const useProfile = () =>
  useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get<Customer>('/customers/profile'),
  });

export const useMyBooks = (kind: 'paid' | 'free') =>
  useQuery({
    queryKey: ['my-books', kind],
    // Same cache tags as v2 so an offline first launch after upgrade still has data.
    queryFn: async () => {
      const res = await api.get<Book[]>(
        '/customers/my-books',
        kind === 'paid' ? { paid: 1 } : { free: 1 },
        {},
        kind === 'paid' ? 'MyPaidBooks' : 'MyFreeBooks',
      );
      return Array.isArray(res) ? res : [];
    },
  });
