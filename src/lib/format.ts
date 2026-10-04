export function formatBytes(bytes: number) {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[i]}`;
}

export function formatDuration(seconds?: number | null) {
  if (!seconds || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

export function yearOf(date?: string | null) {
  if (!date) return null;
  const match = /^(\d{4})/.exec(date);
  return match ? match[1] : null;
}

export function priceOf(price?: string | number | null) {
  const n = Number(price ?? 0);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

export const isFree = (price?: string | number | null) => priceOf(price) === 0;

export function relativeDay(timestamp: number) {
  const day = 24 * 60 * 60 * 1000;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const diff = Math.floor((startOfToday.getTime() - timestamp) / day) + 1;
  if (timestamp >= startOfToday.getTime()) return 'މިއަދު';
  if (diff <= 1) return 'އިއްޔެ';
  if (diff < 30) return `${diff} ދުވަސް ކުރިން`;
  const d = new Date(timestamp);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

/** Strips HTML tags/entities that the CMS sometimes leaves in content blocks. */
export function plainText(html?: string | null) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

export function shuffle<T>(input: T[] | null | undefined): T[] {
  const array = [...(input ?? [])];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
