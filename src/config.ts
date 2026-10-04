import details from '@/details.json';

/** Same backend + OAuth client as v2. */
export const WEBSITE_URL: string = details.website_url;
export const API_URL: string = details.url;
export const CLIENT_ID: number = details.client_id;
export const CLIENT_SECRET: string = details.client_secret;

export const GOOGLE_WEB_CLIENT_ID = '704092881798-qfp7uajqkv638s80shfh4n3v0ru6ihgi.apps.googleusercontent.com';
export const SUPPORT_PHONE = '7585289';

/** Converts a dhivehifoiy.mv link into an in-app route, or null for external links. */
export function toInternalRoute(link?: string | null): string | null {
  if (!link) return null;
  if (link.startsWith(WEBSITE_URL)) {
    const path = link.slice(WEBSITE_URL.length);
    return path.length ? path : '/home';
  }
  return null;
}
