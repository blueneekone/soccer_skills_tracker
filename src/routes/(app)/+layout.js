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
import { redirect } from '@sveltejs/kit';

export const ssr = false;
export const prerender = false;

/** @type {import('./$types').LayoutLoad} */
export async function load({ parent, url }) {
  const { session, userProfile } = await parent();
  const currentPath = url.pathname;

  // 1. Spectator/Public Match Bypass
  if (url.searchParams.has('matchToken') || currentPath.startsWith('/public/match/')) {
    return { bypassAuth: true };
  }

  // 2. Unauthenticated Redirect
  if (!session) {
    if (currentPath === '/login' || currentPath === '/register') return;
    throw redirect(307, '/login');
  }

  // 3. New User Profile Selection Gate (Defensive Null Guard)
  if (!userProfile?.role) {
    if (currentPath === '/onboarding/role-select') return;
    throw redirect(307, '/onboarding/role-select');
  }

  // 4. Purgatory Clearance Redirect (Defensive Null Guard)
  if (userProfile.isCleared === false) {
    if (currentPath.startsWith('/onboarding/clearance')) return;
    throw redirect(307, `/onboarding/clearance/${userProfile.role}`);
  }

  // 5. Completed & Cleared Dashboard Routing
  if (currentPath.startsWith('/onboarding')) {
    throw redirect(302, `/${userProfile.role}/dashboard`);
  }
}