/**
 * REGRESSION-AUDIT-BUNDLE — pre/post deploy acquisition guards.
 * Maps to OWNER_QA_CHECKLIST / GP-ACQ gold paths. Run via:
 *   npm run test:regression:acquisition
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isProfileComplete } from '$lib/auth/profile.js';
import { baseRowsFromHousehold } from '$lib/parent/householdOperatives.js';
import { shouldClearLoadBusy } from '$lib/parent/loadHouseholdClearance.js';
import {
	fieldMenu,
	fieldMenuDismissBlocked,
	FIELD_MENU_DISMISS_GUARD_MS,
} from '$lib/stores/fieldMenu.svelte.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');

const SETUP_PAGE = join(ROOT, 'routes/setup/+page.svelte');
const HOUSEHOLD_PAGE = join(ROOT, 'routes/(app)/parent/household/+page.svelte');
const LOAD_CLEARANCE = join(ROOT, 'lib/parent/loadHouseholdClearance.ts');
const MISSION_RAIL = join(ROOT, 'lib/player/dashboard/missionRailCoachIntents.ts');
const ACTIVE_BOUNTIES = join(ROOT, 'lib/components/hud/ActiveBounties.svelte');
const INTENT_ENGINE = join(ROOT, 'lib/coach/intent/IntentEngine.svelte.ts');
const FORGE_PANEL = join(ROOT, 'lib/coach/intent/ForgeDeployPanel.svelte');
const FIELD_MENU = join(ROOT, 'lib/stores/fieldMenu.svelte.ts');
const MENU_SHEET = join(ROOT, 'lib/components/shell/AppMenuSheet.svelte');
const SIGN_OUT_FLOW = join(ROOT, 'lib/auth/signOutFlow.js');
const PIN_BAR = join(ROOT, 'lib/components/shell/MobilePinBar.svelte');

describe('GP-GATE / SETUP — acquisition profile + setup guards', () => {
	it('isProfileComplete: parent with householdId is complete (provisioned re-entry)', () => {
		expect(
			isProfileComplete({
				role: 'parent',
				householdId: 'qa_launch_2026_parent_hh',
			}),
		).toBe(true);
	});

	it('isProfileComplete: parent without clubId or householdId is incomplete', () => {
		expect(isProfileComplete({ role: 'parent' })).toBe(false);
	});

	it('setup page uses joinable clubs callable and dispatch code — not sole getDocs(clubs)', () => {
		const setup = readFileSync(SETUP_PAGE, 'utf-8');
		expect(setup).toMatch(/listJoinableClubsCallable/);
		expect(setup).toMatch(/resolveDispatchCodeCallable/);
		expect(setup).toMatch(/httpsCallable[\s\S]*'listJoinableClubs'/);
		expect(setup).toMatch(/httpsCallable[\s\S]*'resolveDispatchCode'/);
		expect(setup).not.toMatch(/getDocs\(\s*collection\(\s*db,\s*['"]clubs['"]\s*\)/);
	});
});

describe('GP-ACQ-01 / household — clearance load regression guards', () => {
	const loadClearance = readFileSync(LOAD_CLEARANCE, 'utf-8');
	const householdPage = readFileSync(HOUSEHOLD_PAGE, 'utf-8');

	it('loadHouseholdClearance uses passed db — not getActiveDb for households read', () => {
		expect(loadClearance).toMatch(/fetchHouseholdClearance\(\s*db:\s*Firestore/);
		expect(loadClearance).not.toMatch(/getActiveDb\(\)/);
		expect(householdPage).toMatch(/fetchHouseholdClearance\(db,\s*hid\)/);
		expect(householdPage).not.toMatch(/fetchHouseholdClearance\(getActiveDb\(\)/);
	});

	it('baseRowsFromHousehold dedupes duplicate playerEmails (first row wins)', () => {
		const rows = baseRowsFromHousehold({
			playerEmails: [
				'ace@operative.local',
				'ACE@operative.local',
				'nova@operative.local',
				'ace@operative.local',
			],
			playerNames: ['Ace Star', 'Duplicate Ace', 'Nova', 'Ace Again'],
			playerCallsigns: ['ace_star', '', 'nova', ''],
		});
		expect(rows).toHaveLength(2);
		expect(rows.map((r) => r.email)).toEqual(['ace@operative.local', 'nova@operative.local']);
		expect(rows[0]?.name).toBe('Ace Star');
	});

	it('household +page.svelte uses generation-guarded loadBusy (shouldClearLoadBusy)', () => {
		expect(householdPage).toContain('shouldClearLoadBusy');
		expect(householdPage).toContain('clearanceFetchGeneration');
		expect(householdPage).toMatch(/shouldClearLoadBusy\(/);
		expect(shouldClearLoadBusy(true)).toBe(true);
		expect(shouldClearLoadBusy(false)).toBe(false);
	});
});

describe('GP-ACQ-03 / GP-ACQ-04a — coach intent → player mission rail', () => {
	it('fetchCoachIntentQuests queries team_assignments with teamId + status active', () => {
		const src = readFileSync(MISSION_RAIL, 'utf-8');
		expect(src).toMatch(/collection\(db,\s*['"]team_assignments['"]\)/);
		expect(src).toMatch(/where\(\s*['"]teamId['"],\s*['"]==['"],\s*teamId\)/);
		expect(src).toMatch(/where\(\s*['"]status['"],\s*['"]==['"],\s*['"]active['"]\)/);
	});

	it('ActiveBounties imports deduplicateById and coachIntentReadyToClaim', () => {
		const src = readFileSync(ACTIVE_BOUNTIES, 'utf-8');
		expect(src).toMatch(/import[\s\S]*deduplicateById[\s\S]*deduplicateMissions/);
		expect(src).toMatch(/import[\s\S]*coachIntentReadyToClaim[\s\S]*activeBounties/);
		expect(src).toMatch(/deduplicateById\(sortedQuests\)/);
		expect(src).toMatch(/coachIntentReadyToClaim\(/);
	});

	it('ForgeDeployPanel / secureDeployIntent path still writes team_assignments', () => {
		const engine = readFileSync(INTENT_ENGINE, 'utf-8');
		expect(engine).toMatch(/httpsCallable[\s\S]*'secureDeployIntent'/);
		expect(engine).toMatch(/collection\(db,\s*['"]team_assignments['"]\)/);
		expect(readFileSync(FORGE_PANEL, 'utf-8')).toContain('onDeploy');
	});
});

describe('NAV / menu Phase 4b — field chrome regression guards', () => {
	const fieldMenuSrc = readFileSync(FIELD_MENU, 'utf-8');
	const menuSheet = readFileSync(MENU_SHEET, 'utf-8');
	const pinBar = readFileSync(PIN_BAR, 'utf-8');

	beforeEach(() => {
		fieldMenu.close();
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-06-20T12:00:00.000Z'));
	});

	afterEach(() => {
		fieldMenu.close();
		vi.useRealTimers();
	});

	it('fieldMenu.openBrowse sets openedAt before open=true (behavioral)', () => {
		expect(fieldMenuSrc).toMatch(
			/openBrowse\(\):\s*void\s*\{[\s\S]*?fieldMenuState\.openedAt\s*=\s*Date\.now\(\);[\s\S]*?fieldMenuState\.open\s*=\s*true;/,
		);
		fieldMenu.openBrowse();
		expect(fieldMenu.open).toBe(true);
		expect(fieldMenu.openedAt).toBe(Date.now());
	});

	it('sign-out flow closes field menu sheet (signOutFlow closes before goto)', () => {
		expect(menuSheet).toContain("import { handleSignOut } from '$lib/auth/signOutFlow.js'");
		expect(menuSheet).toMatch(/async function disconnect\(\)[\s\S]*fieldMenu\.close\(\)/);
		const signOutFlow = readFileSync(SIGN_OUT_FLOW, 'utf-8');
		expect(signOutFlow).toMatch(/fieldMenu\.close\(\)[\s\S]*goto\(loginPath/);
	});

	it('AppMenuSheet dismissSheet respects fieldMenuDismissBlocked', () => {
		expect(menuSheet).toContain('function dismissSheet()');
		expect(menuSheet).toMatch(/dismissSheet\(\)[\s\S]*fieldMenuDismissBlocked\(\)/);
		expect(menuSheet).toContain('FIELD_MENU_DISMISS_GUARD_MS');
		fieldMenu.openBrowse();
		expect(fieldMenuDismissBlocked()).toBe(true);
		vi.advanceTimersByTime(FIELD_MENU_DISMISS_GUARD_MS);
		expect(fieldMenuDismissBlocked()).toBe(false);
	});

	it('browse mode exposes pin customization via pick-pin OR long-press on pin bar', () => {
		const hasPickPinMode = menuSheet.includes("mode === 'pick-pin'") && menuSheet.includes('onPickPin');
		const hasLongPressPinBar =
			pinBar.includes('onPinLongPress') &&
			pinBar.includes('LONG_PRESS_MS') &&
			/long press/i.test(pinBar);
		const hasBrowsePinActions =
			menuSheet.includes('Pin to bar') &&
			menuSheet.includes('Unpin') &&
			menuSheet.includes('navPinsStore.setPin');
		expect(hasPickPinMode || hasLongPressPinBar || hasBrowsePinActions).toBe(true);
		expect(pinBar).toMatch(/aria-label="Pin a route — long press to customize"/);
	});
});
