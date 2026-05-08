// Marketing / public pages — fully pre-rendered for SEO performance.
// Unlike the authenticated (app) group, these pages do NOT require client-side
// auth state on first paint. Auth redirect runs client-side after hydration.
export const ssr = true;
export const prerender = true;
