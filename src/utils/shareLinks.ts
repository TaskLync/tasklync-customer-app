/**
 * Share-link contract (single source of truth, pure, no React).
 *
 *   https://tasklync.pk/worker/<id>     -> /worker/<id>
 *   https://tasklync.pk/company/<id>    -> /company/<id>
 *
 * The URL path IS the in-app route, so the web page, the Android App Link, the iOS Universal Link and
 * the expo-router route all share one permanent, entity-based address. Only an allowlist of entity
 * types and a strict id shape is ever accepted; anything else resolves to null (caller falls back to Home).
 */

export const SHARE_HOST = 'tasklync.pk';
export const SHARE_ORIGIN = `https://${SHARE_HOST}`;
/** Hosts treated as ours (www is redirected to the apex by the web tier but may still arrive in old shares). */
const ACCEPTED_HOSTS = new Set([SHARE_HOST, `www.${SHARE_HOST}`]);

export const ANDROID_PACKAGE = 'com.tasklync.user';
export const IOS_APP_STORE_ID: string | null = null; // set once the App Store listing exists

export type ShareEntityType = 'worker' | 'company';
export interface ShareTarget {
  type: ShareEntityType;
  id: string;
}

const ENTITY_TYPES: readonly ShareEntityType[] = ['worker', 'company'];
/** UUIDs and slug-like ids; rejects path traversal, whitespace, query/hash injection. */
const ID_PATTERN = /^[A-Za-z0-9_-]{6,64}$/;

export const isValidEntityId = (id: unknown): id is string =>
  typeof id === 'string' && ID_PATTERN.test(id);

export function buildShareUrl(type: ShareEntityType, id: string): string {
  if (!isValidEntityId(id)) throw new Error('Invalid entity id');
  return `${SHARE_ORIGIN}/${type}/${id}`;
}

/** The in-app route for a target. */
export const routeFor = (target: ShareTarget): string => `/${target.type}/${target.id}`;

/**
 * Parses an https share URL, an app-scheme URL (tasklync://worker/<id>) or a bare path (/worker/<id>).
 * Returns null for anything that is not exactly one known entity page.
 */
export function parseShareLink(input: string | null | undefined): ShareTarget | null {
  if (typeof input !== 'string') return null;
  const raw = input.trim();
  if (!raw || raw.length > 2048) return null;

  let pathname: string;
  if (/^https:\/\//i.test(raw)) {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      return null;
    }
    if (url.username || url.password || url.port) return null;
    if (!ACCEPTED_HOSTS.has(url.hostname.toLowerCase())) return null;
    pathname = url.pathname;
  } else if (/^tasklync:\/\//i.test(raw)) {
    pathname = '/' + raw.replace(/^tasklync:\/\//i, '').split(/[?#]/)[0];
  } else if (raw.startsWith('/')) {
    pathname = raw.split(/[?#]/)[0] ?? '';
  } else {
    return null;
  }

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length !== 2) return null;
  const [type, id] = segments as [string, string];
  if (!(ENTITY_TYPES as readonly string[]).includes(type)) return null;
  if (!isValidEntityId(id)) return null;
  return { type: type as ShareEntityType, id };
}

/** Text for the system share sheet. The link is IN the message because Android's Share ignores `url`. */
export function buildShareMessage(lead: string, type: ShareEntityType, id: string): string {
  return `${lead}\n${buildShareUrl(type, id)}`;
}

// ── Deferred deep linking handoff (install -> first launch) ──────────────────

/** Value the web fallback page puts in the Play Store `referrer` param: `link=<urlencoded path>`. */
export function parsePlayInstallReferrer(referrer: string | null | undefined): ShareTarget | null {
  if (!referrer) return null;
  try {
    const params = new URLSearchParams(referrer);
    const link = params.get('link');
    return link ? parseShareLink(link) : null;
  } catch {
    return null;
  }
}

/** Play Store URL the web fallback page sends Android users to, carrying the destination. */
export function buildPlayStoreUrl(target: ShareTarget): string {
  const referrer = encodeURIComponent(`link=${routeFor(target)}`);
  return `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}&referrer=${referrer}`;
}
