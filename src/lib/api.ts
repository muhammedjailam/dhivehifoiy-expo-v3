import NetInfo from '@react-native-community/netinfo';
import EncryptedStorage from 'react-native-encrypted-storage';
import { API_URL } from '../config';

/**
 * Port of v2 `hooks/Request.js`. Same endpoints, same token key and the same
 * offline cache tags so an upgrade from v2 keeps the user signed in.
 */

export const ACCESS_TOKEN_KEY = 'access-token';
export const CACHE_TAGS = ['MyFreeBooks', 'MyPaidBooks'] as const;

const SUCCESS = [200, 201, 203];

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(status: number, data: any, message?: string) {
    super(message ?? data?.message ?? `Request failed (${status})`);
    this.status = status;
    this.data = data;
  }
}

export class OfflineError extends Error {
  constructor() {
    super('No network connection');
  }
}

let unauthorizedHandler: (() => void) | null = null;
let tokenMemo: string | null = null;

export function setUnauthorizedHandler(fn: (() => void) | null) {
  unauthorizedHandler = fn;
}

export async function getToken(): Promise<string> {
  if (tokenMemo) return tokenMemo;
  const token = await EncryptedStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) throw new Error('No access token found');
  tokenMemo = token;
  return token;
}

export async function hasToken(): Promise<boolean> {
  try {
    await getToken();
    return true;
  } catch {
    return false;
  }
}

export async function setToken(token: string) {
  tokenMemo = token;
  await EncryptedStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export async function clearSession() {
  tokenMemo = null;
  for (const key of [...CACHE_TAGS, ACCESS_TOKEN_KEY]) {
    try {
      await EncryptedStorage.removeItem(key);
    } catch {
      // ignore missing keys
    }
  }
}

export function buildUrl(endpoint: string, params: Record<string, any> = {}, filters: Record<string, any> = {}) {
  const clean = endpoint.replace(API_URL, '');
  const query: string[] = [];
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    query.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  });
  Object.entries(filters).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    query.push(`${encodeURIComponent(`filter[${k}]`)}=${encodeURIComponent(String(v))}`);
  });
  if (!query.length) return clean;
  return `${clean}${clean.includes('?') ? '&' : '?'}${query.join('&')}`;
}

async function handle<T>(response: Response, cacheTag?: string | null): Promise<T> {
  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (response.status === 401) {
    unauthorizedHandler?.();
  }

  if (SUCCESS.includes(response.status)) {
    if (cacheTag) {
      EncryptedStorage.setItem(cacheTag, JSON.stringify(data)).catch(() => {});
    }
    return data as T;
  }
  throw new ApiError(response.status, data);
}

async function readCache<T>(cacheTag: string): Promise<T> {
  const cached = await EncryptedStorage.getItem(cacheTag);
  if (!cached) throw new OfflineError();
  return JSON.parse(cached) as T;
}

export async function isOnline() {
  const state = await NetInfo.fetch();
  return state.isConnected !== false && state.isInternetReachable !== false;
}

export const api = {
  async get<T = any>(
    endpoint: string,
    params: Record<string, any> = {},
    filters: Record<string, any> = {},
    cacheTag: string | null = null,
  ): Promise<T> {
    if (!(await isOnline())) {
      if (cacheTag) return readCache<T>(cacheTag);
      throw new OfflineError();
    }
    const token = await getToken();
    try {
      const response = await fetch(API_URL + buildUrl(endpoint, params, filters), {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      });
      return await handle<T>(response, cacheTag);
    } catch (e) {
      // Flaky connection: fall back to the last good response when we have one.
      if (cacheTag && !(e instanceof ApiError)) return readCache<T>(cacheTag);
      throw e;
    }
  },

  async post<T = any>(endpoint: string, body: Record<string, any> = {}, method: 'POST' | 'PUT' | 'PATCH' = 'POST'): Promise<T> {
    const token = await getToken();
    const response = await fetch(API_URL + endpoint, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    return handle<T>(response);
  },

  async upload<T = any>(endpoint: string, files: { name: string; uri: string; type?: string }[], params: Record<string, string> = {}): Promise<T> {
    const token = await getToken();
    const data = new FormData();
    files.forEach((file) => {
      data.append(file.name, { uri: file.uri, type: file.type ?? 'image/jpeg', name: file.name } as any);
    });
    Object.entries(params).forEach(([k, v]) => data.append(k, v));
    const response = await fetch(API_URL + endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      body: data,
    });
    return handle<T>(response);
  },
};

/** Exchange a Google server auth code / Apple identity token for an API token (same as v2). */
export async function socialLogin(provider: 'google' | 'apple', accessToken: string, clientId: number, clientSecret: string) {
  const response = await fetch(`${API_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      grant_type: 'social',
      client_id: clientId,
      client_secret: clientSecret,
      provider,
      access_token: accessToken,
    }),
  });
  const json = await response.json().catch(() => null);
  if (!json?.access_token) throw new ApiError(response.status, json, 'Login failed');
  return json.access_token as string;
}

export function errorMessage(e: unknown): string {
  if (e instanceof OfflineError) return 'އިންޓަނެޓް ކަނެކްޝަނެއް ނެތް';
  if (e instanceof ApiError) {
    const msg = e.data?.message;
    if (typeof msg === 'string' && msg.length) return msg;
  }
  return 'މައްސަލައެއް ދިމާވެއްޖެ، ކުޑައިރުކޮޅަކުން އަލުން މަސައްކަތްކޮށްލައްވާ!';
}
