/**
 * (app) layout — CSR-only.
 *
 * Every route under the authenticated shell requires Firebase Auth, which only
 * works in the browser.  Disabling SSR here prevents SvelteKit from attempting
 * server-side renders that would fail without a Firebase session — and keeps
 * bundle splits lean since server code is never emitted for these routes.
 *
 * The /terms, /privacy, /login, and /setup routes live outside this group and
 * retain their default SSR behaviour for SEO and fast first-paint.
 */
export const ssr = false;
export const prerender = false;
