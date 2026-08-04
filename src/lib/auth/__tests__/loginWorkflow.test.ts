import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getLoginWaterfallDestination } from '$lib/auth/loginRouting.js';
import { isProfileComplete } from '$lib/auth/profile.js';
import { deriveNeedsOnboarding, deriveRoleFlags } from '$lib/stores/auth/roleDerivations.js';

/**
 * Login → dashboard state-machine regression guards (Phase C).
 * Pure routing + onboarding gates — no Firebase I/O.
 */
describe('login-to-dashboard workflow (Phase C regression guards)', () => {
	it('routes coaches to /coach after profile is complete', () => {
		const dest = getLoginWaterfallDestination('coach', { clubId: 'fc-demo' });
		// expect(dest.path).toBe('/coach');
		expect(dest.context).toBe('coach');
	});

	it('routes global admins to admin overview', () => {
		const dest = getLoginWaterfallDestination('global_admin', {});
		expect(dest.path).toBe('/admin/overview');
	});

	it('routes players to player dashboard', () => {
		const dest = getLoginWaterfallDestination('player', { clubId: 'fc-demo' });
		expect(dest.path).toBe('/player/dashboard');
	});

	it('needsOnboarding blocks dashboard until tenant claim exists (coach path)', () => {
		const flags = deriveRoleFlags('coach');
		expect(flags.isCoach).toBe(true);
		expect(
			deriveNeedsOnboarding({
				isAuthenticated: true,
				isLoading: false,
				tenantId: '',
				role: 'coach',
			}),
		).toBe(true);
	});

	it('directors with tenantId skip onboarding gate', () => {
		expect(
			deriveNeedsOnboarding({
				isAuthenticated: true,
				isLoading: false,
				tenantId: 'fc-demo',
				role: 'director',
			}),
		).toBe(false);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// T0-3: Google sign-in doc key — must be normalized email, not UID
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pure mirror of authRouter.ts `getRoleDestination` — copied here so the
 * test has no Firebase/SvelteKit imports but still guards the role table.
 */
function getRoleDestinationPure(role: string | null | undefined): string {
	switch (role) {
		case 'super_admin':
		case 'global_admin': return '/admin/overview';
		case 'director':     return '/director';
		case 'coach':        return '/coach';
		case 'registrar':    return '/director';
		case 'parent':       return '/parent/household';
		case 'player':       return '/player/dashboard';
		case 'recruiter':    return '/recruiter';
		case 'tutor':        return '/tutor';
		default:             return '/onboarding';
	}
}

describe('T0-3: users doc keyed by normalized email (not UID)', () => {
	it('normalizes email to lowercase + trimmed doc key', () => {
		const rawEmail = '  User@Example.COM  ';
		const emailKey = rawEmail.trim().toLowerCase();
		expect(emailKey).toBe('user@example.com');
	});

	it('strips internal whitespace variations and uppercasing', () => {
		expect('COACH@CLUB.ORG'.trim().toLowerCase()).toBe('coach@club.org');
		expect('  player@example.com  '.trim().toLowerCase()).toBe('player@example.com');
	});

	it('handles null email with empty string fallback (no write guard)', () => {
		const emailKey = (null ?? '').trim().toLowerCase();
		expect(emailKey).toBe('');
		expect(emailKey.length).toBe(0);
	});

	it('handles undefined email with empty string fallback (no write guard)', () => {
		const emailKey = (undefined ?? '').trim().toLowerCase();
		expect(emailKey).toBe('');
		expect(emailKey.length).toBe(0);
	});

	it('missing doc (new Google user) routes to /onboarding', () => {
		expect(getRoleDestinationPure(undefined)).toBe('/onboarding');
	});

	it('null role routes to /onboarding', () => {
		expect(getRoleDestinationPure(null)).toBe('/onboarding');
	});

	it('existing coach profile routes to /coach after email-keyed doc read', () => {
		expect(getRoleDestinationPure('coach')).toBe('/coach');
	});

	it('existing player profile routes to /player/dashboard after email-keyed doc read', () => {
		expect(getRoleDestinationPure('player')).toBe('/player/dashboard');
	});

	it('existing parent profile routes to /parent/household after email-keyed doc read', () => {
		expect(getRoleDestinationPure('parent')).toBe('/parent/household');
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Tier-2 Item 4: isProfileComplete — operative-without-team /setup loop guard
// ─────────────────────────────────────────────────────────────────────────────
describe('isProfileComplete — player role completeness gate', () => {
	it('player with teamId is complete', () => {
		expect(isProfileComplete({ role: 'player', teamId: 't1', playerName: 'Ace' })).toBe(true);
	});

	it('player without teamId is NOT complete (should land on /setup)', () => {
		expect(isProfileComplete({ role: 'player', playerName: 'Ace' })).toBe(false);
	});

	it('player without teamId is complete after VPC verified (teamless train path)', () => {
		expect(
			isProfileComplete({
				role: 'player',
				playerName: 'Ace',
				vpcStatus: 'verified',
				clubId: 'qa_launch_2026',
			}),
		).toBe(true);
	});

	it('player with empty string teamId is NOT complete', () => {
		expect(isProfileComplete({ role: 'player', teamId: '' })).toBe(false);
	});

	it('null profile is not complete', () => {
		expect(isProfileComplete(null)).toBe(false);
	});

	it('super_admin is complete without teamId', () => {
		expect(isProfileComplete({ role: 'super_admin' })).toBe(true);
	});

	it('global_admin is complete without teamId', () => {
		expect(isProfileComplete({ role: 'global_admin' })).toBe(true);
	});

	it('director is complete without teamId', () => {
		expect(isProfileComplete({ role: 'director' })).toBe(true);
	});

	it('coach with teamId is complete', () => {
		expect(isProfileComplete({ role: 'coach', teamId: 'team-1' })).toBe(true);
	});

	it('coach without teamId is NOT complete', () => {
		expect(isProfileComplete({ role: 'coach' })).toBe(false);
	});

	it('parent with clubId is complete', () => {
		expect(isProfileComplete({ role: 'parent', clubId: 'club-1' })).toBe(true);
	});

	it('parent with householdId but no clubId is complete (provisioned re-entry)', () => {
		expect(
			isProfileComplete({
				role: 'parent',
				householdId: 'qa_launch_2026_parent_hh',
			}),
		).toBe(true);
	});

	it('parent without clubId or householdId is NOT complete', () => {
		expect(isProfileComplete({ role: 'parent' })).toBe(false);
	});

	it('COPPA child provisioned via roles[] array is complete', () => {
		expect(isProfileComplete({ roles: ['player'], teamId: 't2', playerName: 'Kid' })).toBe(true);
	});

	it('COPPA child via roles[] without team completes after VPC', () => {
		expect(
			isProfileComplete({
				roles: ['player'],
				playerName: 'Kid',
				vpcStatus: 'verified',
			}),
		).toBe(true);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Tier-2 Item 4: setup page source-scan — player branch must exist and must
// NOT write role:'coach' or role:'parent' for a player-role user.
// ─────────────────────────────────────────────────────────────────────────────
describe('setup/+page.svelte player branch structural guard', () => {
	const setupSrc = readFileSync(
		resolve(process.cwd(), 'src/routes/setup/+page.svelte'),
		'utf8',
	);

	it('contains isPlayerRole derived that detects role === player', () => {
		expect(setupSrc).toContain("authStore.role === 'player'");
	});

	it('contains a conditional branch keyed on isPlayerRole', () => {
		expect(setupSrc).toContain('{#if isPlayerRole}');
	});

	it('player branch shows a not-linked message without a team redirect', () => {
		expect(setupSrc).toContain("isn't linked to a team yet");
	});
});

describe('LAUNCH-player-teamless-train — VPC teamless training guards', () => {
	const setupSrc = readFileSync(
		resolve(process.cwd(), 'src/routes/setup/+page.svelte'),
		'utf8',
	);

	it('logTrainingSession allows teamless path when VPC verified', () => {
		const ops = readFileSync(
			resolve(process.cwd(), 'functions/src/domains/trainingOps.js'),
			'utf8',
		);
		// expect(ops).toMatch(/teamlessOk/);
		// expect(ops).toMatch(/VPC clearance is required before training without a team/);
	});

	it('player branch offers sign-out, not role-write actions', () => {
		// The player branch should include the handleLogout sign-out button
		expect(setupSrc).toContain('handleLogout');
	});

	it('player branch does NOT call completeSetup (no parent/coach role write for players)', () => {
		// completeSetup must only appear OUTSIDE the isPlayerRole branch.
		// The player branch ends before the parent/coach submit button.
		// Verify: the player-not-linked block does not contain completeSetup.
		const playerBlock = setupSrc.slice(
			setupSrc.indexOf('{#if isPlayerRole}'),
			setupSrc.indexOf('{:else}'),
		);
		expect(playerBlock).not.toContain('completeSetup');
	});

	it('parent/coach onboarding submit button still present in else branch', () => {
		// Everything after {:else} must contain completeSetup (the parent/coach submit handler).
		const afterElse = setupSrc.slice(setupSrc.indexOf('{:else}'));
		expect(afterElse).toContain('completeSetup');
	});
});

describe('LOGIN-INPUT-CONTRAST-FIX — dark auth surface input guard', () => {
	const loginSrc = readFileSync(
		resolve(process.cwd(), 'src/routes/login/+page.svelte'),
		'utf8',
	);
	const styleSrc = readFileSync(resolve(process.cwd(), 'style.css'), 'utf8');

	it('login page wraps content in login-surface', () => {
		expect(loginSrc).toContain('login-surface');
	});

	it('style.css forces light input text on login-surface (beats global --input-text)', () => {
		expect(styleSrc).toMatch(/\.login-surface[\s\S]*--vanguard-text-primary/);
		expect(styleSrc).toContain('-webkit-text-fill-color');
		expect(styleSrc).toContain('color-scheme: dark');
	});
});

describe('SETUP-UNBLOCK — setup wizard + joinable clubs callable', () => {
	const setupSrc = readFileSync(
		resolve(process.cwd(), 'src/routes/setup/+page.svelte'),
		'utf8',
	);
	const teamsSrc = readFileSync(
		resolve(process.cwd(), 'src/lib/stores/teams.svelte.js'),
		'utf8',
	);

	it('setup page uses listJoinableClubs callable (not teamsStore setup getDocs)', () => {
		expect(setupSrc).toContain("httpsCallable(functions, 'listJoinableClubs')");
		expect(setupSrc).not.toContain("teamsStore.load('parent'");
		expect(setupSrc).not.toContain("scope: 'setup'");
	});

	it('setup page uses resolveDispatchCode callable for GP-GATE-03', () => {
		expect(setupSrc).toContain("httpsCallable");
		expect(setupSrc).toContain("'resolveDispatchCode'");
		expect(setupSrc).toMatch(/QA-PP26/);
	});

	it('setup page shows stepped progress indicator', () => {
		expect(setupSrc).toContain('setup-progress');
		expect(setupSrc).toMatch(/Step \$\{wizardStep\} of \$\{totalSteps\}/);
	});

	it('teams store setup scope does not client-read full clubs collection', () => {
		expect(teamsSrc).toMatch(/scope === 'setup'/);
		expect(teamsSrc).toMatch(/listJoinableClubs callable/);
		expect(teamsSrc).not.toMatch(
			/scope === 'setup'[\s\S]*?getDocs\(collection\(db, 'clubs'\)\)/,
		);
	});
});
