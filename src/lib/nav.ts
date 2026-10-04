import { Linking } from 'react-native';
import { router } from 'expo-router';
import { toInternalRoute } from '../config';

type BookLike = { slug: string; thumb?: string | null; name_dv?: string | null; author_name?: string | null };

/**
 * Opens the store page. Passing cover + title lets the detail screen render the
 * shared cover immediately so the shared-element morph has a destination.
 */
export function openBookDetail(book: BookLike, tag?: string) {
  router.push({
    pathname: '/books/[slug]',
    params: {
      slug: book.slug,
      ...(tag ? { tag } : {}),
      ...(book.thumb ? { thumb: book.thumb } : {}),
      ...(book.name_dv ? { name_dv: book.name_dv } : {}),
      ...(book.author_name ? { author: book.author_name } : {}),
    },
  });
}

export const coverTag = (scope: string, uuidOrSlug: string) => `cover-${scope}-${uuidOrSlug}`;

/** Handles links from slides / notifications: in-app routes navigate, others open externally. */
export function openLink(url?: string | null, mode: 'push' | 'navigate' = 'navigate') {
  if (!url) return;
  const internal = toInternalRoute(url);
  if (internal) {
    if (mode === 'push') router.push(internal as any);
    else router.navigate(internal as any);
  } else {
    Linking.openURL(url).catch((err) => console.warn('Failed to open external URL', err));
  }
}
