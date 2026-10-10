/**
 * Backing store for the global `next/headers` mock registered in tests/setup.ts.
 *
 * Several routes/actions call `cookies()`/`headers()` from `next/headers` (not
 * `NextRequest.cookies`), which only works inside Next's own request-scoped
 * AsyncLocalStorage. Calling those route handlers directly from Vitest has no
 * such scope, so we stand in for it: tests set the "current request" cookies
 * and headers here before invoking a handler.
 */
let cookieMap: Record<string, string> = {};
let headerMap: Record<string, string> = {};

export function setRequestCookies(map: Record<string, string> = {}) {
  cookieMap = map;
}

export function setRequestHeaders(map: Record<string, string> = {}) {
  headerMap = Object.fromEntries(Object.entries(map).map(([k, v]) => [k.toLowerCase(), v]));
}

export function clearRequestContext() {
  cookieMap = {};
  headerMap = {};
}

export function getCookieStore() {
  return {
    get: (name: string) => (cookieMap[name] !== undefined ? { name, value: cookieMap[name] } : undefined),
    getAll: () => Object.entries(cookieMap).map(([name, value]) => ({ name, value })),
  };
}

export function getHeaderStore() {
  return {
    get: (name: string) => headerMap[name.toLowerCase()] ?? null,
  };
}
