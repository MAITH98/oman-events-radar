/**
 * Response headers for every page route.
 *
 * Pages depend on the visitor's preference cookie (language and theme render on the server), so they must never be
 * reused by a shared cache, and the browser must check with the server before reusing its own copy — otherwise a
 * language or theme switch shows the old page until the cache runs out. Speed comes from the server-side API cache
 * in features/events/api.ts instead.
 *
 * Hardening on every page: no framing by other sites (clickjacking; same-origin framing stays allowed), no MIME sniffing, and only the origin is sent
 * as referrer to other sites.
 */
export const PAGE_HEADERS = {
  "Cache-Control": "private, no-cache",
  Vary: "Cookie",
  "Content-Security-Policy": "frame-ancestors 'self'",
  "X-Frame-Options": "SAMEORIGIN",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
} as const;
