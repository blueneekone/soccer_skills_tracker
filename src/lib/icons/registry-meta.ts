/**
 * registry-meta.ts
 * Exports icon registry metadata (keys only) for use in test environments
 * where Svelte component imports are not supported (e.g. Vitest node env).
 *
 * This list MUST stay in sync with registry.ts.
 * Validation: Icon.test.ts asserts all expected tokens are present.
 */

export const REGISTRY_KEYS = [
	// Status
	'status.verified', 'status.warning', 'status.error', 'status.pending',
	'status.info', 'status.loading', 'status.warning-circle', 'status.error-circle',
	'status.check', 'status.check-square', 'status.circle-plus', 'status.circle-play',
	'status.shield', 'status.shield-check', 'status.shield-alert', 'status.shield-plus',
	'status.shield-ban', 'status.shield-x', 'status.shield-half', 'status.seal-check',
	// Navigation
	'nav.home', 'nav.menu', 'nav.sidebar', 'nav.chevron-down', 'nav.chevron-left',
	'nav.chevron-right', 'nav.sort', 'nav.arrow-down', 'nav.arrow-left',
	'nav.arrow-right', 'nav.arrow-up-right', 'nav.arrow-swap', 'nav.arrow-sort',
	'nav.external', 'nav.sign-in', 'nav.sign-out', 'nav.refresh', 'nav.maximize',
	'nav.minimize', 'nav.crosshair', 'nav.arrow-left',
	// System / UI
	'sys.server', 'sys.dollar',
	'sys.close', 'sys.lock', 'sys.lock-simple', 'sys.eye', 'sys.hexagon',
	'sys.triangle', 'sys.square', 'sys.square-dash', 'sys.minus', 'sys.circle',
	'sys.question', 'sys.heart',
	// Actions
	'action.search', 'action.edit', 'action.eraser', 'action.filter', 'action.add',
	'action.delete',
	// Game / sport
	'game.trophy', 'game.star', 'game.zap', 'game.flame', 'game.dumbbell',
	'game.diamond', 'game.seedling',
	// User / org
	'user.profile', 'user.group', 'user.add', 'user.badge',
	'org.building',
	// Data / content
	'data.chart-line', 'data.chart-bar', 'data.chart-bar-2', 'data.chart-pie', 'data.activity',
	'content.text', 'content.books',
	// Communication
	'comm.bell', 'comm.chats', 'comm.share',
	// Environment
	'env.snow', 'env.wifi', 'net.online', 'net.offline',
	// Sports
	'sport.soccer', 'sport.basketball', 'sport.baseball', 'sport.football',
	'sport.volleyball', 'sport.hockey', 'sport.lacrosse', 'sport.generic',
] as const;

export type RegistryKey = typeof REGISTRY_KEYS[number];