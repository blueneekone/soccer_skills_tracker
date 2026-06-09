/**
 * playerHudSprint313.test.ts — Sprint 3.1.3 recovery + CSS existence guards
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const APP_CSS = join(ROOT, 'app.css');
const HUD_CSS = join(ROOT, 'lib/styles/player-dashboard-hud.css');
const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const STUDIO = join(ROOT, 'lib/components/player/OperativeLoadoutStudio.svelte');

const appCssSrc = existsSync(APP_CSS) ? readFileSync(APP_CSS, 'utf-8') : '';
const hudCssSrc = existsSync(HUD_CSS) ? readFileSync(HUD_CSS, 'utf-8') : '';
const pageSrc = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const studioSrc = existsSync(STUDIO) ? readFileSync(STUDIO, 'utf-8') : '';

describe('Sprint 3.1.3 — bento-span-5 in app.css', () => {
	it('defines .bento-span-5 { grid-column: span 5; }', () => {
		expect(appCssSrc).toMatch(/\.bento-span-5\s*\{\s*grid-column:\s*span\s+5;\s*\}/);
	});

	it('mobile collapse includes bento-span-5', () => {
		expect(appCssSrc).toMatch(
			/@media \(max-width: 63\.99rem\)[\s\S]*?\.bento-span-5[\s\S]*?grid-column:\s*1\s*\/\s*-1/,
		);
	});
});

describe('Sprint 3.1.3 — quest-hero__cta self-contained gold styles', () => {
	it('hero CTA block has border, padding, chamfer — not .ibm-cta scoped', () => {
		const block =
			hudCssSrc.match(/\.player-hud-root \.quest-hero__cta\s*\{[\s\S]*?\}/)?.[0] ?? '';
		expect(block).toMatch(/border:\s*1px|border:/);
		expect(block).toMatch(/padding:/);
		expect(block).toMatch(/clip-path:\s*polygon/);
		expect(block).not.toMatch(/\.ibm-cta/);
	});
});

describe('Sprint 3.1.3 — init modal primary CTA (global overlay)', () => {
	it('uses .init-modal__cta--primary without .player-dossier-root ancestor', () => {
		const hasGlobalPrimary = /\.init-modal__cta--primary\s*\{/.test(hudCssSrc);
		const pageHasDossierOnModal =
			/init-modal[\s\S]{0,200}player-dossier-root|player-dossier-root[\s\S]{0,200}init-modal/.test(
				pageSrc,
			);
		expect(hasGlobalPrimary || pageHasDossierOnModal).toBe(true);
		expect(hudCssSrc).not.toMatch(
			/\.player-dossier-root\s+\.init-modal__cta--primary\s*\{/,
		);
	});

	it('primary rule has gold background and dark text', () => {
		const primaryBlock =
			hudCssSrc.match(/\.init-modal__cta--primary\s*\{[\s\S]*?\}/)?.[0] ?? '';
		expect(primaryBlock).toMatch(/background:\s*var\(--pd-accent-action|#fbbf24/);
		expect(primaryBlock).toMatch(/color:\s*#05050a/);
	});
});

describe('Sprint 3.1.3 — cross-file bento span guard', () => {
	const spansUsed = [...studioSrc.matchAll(/bento-span-(\d+)/g)].map((m) => Number(m[1]));
	const required = [3, 4, 5].filter((n) => spansUsed.includes(n));

	for (const n of required) {
		it(`app.css defines .bento-span-${n} { grid-column: span ${n}`, () => {
			expect(appCssSrc).toMatch(
				new RegExp(`\\.bento-span-${n}\\s*\\{\\s*grid-column:\\s*span\\s+${n};\\s*\\}`),
			);
		});
	}
});

// ── T1-7 regression guard: ArmoryEngine armory.stats uid vs email key ────────
// Proving Grounds (ProvingGrounds.svelte) calls armory.updateStat() → _syncStat().
// The stat must be written to users/{emailKey} (email-keyed profile doc) so the
// stats radar (deriveVanguardPrism via authStore.userProfile.armory.stats) can
// read it.  Writing to users/{uid} instead silently produces an empty radar.

const ARMORY_ENGINE = join(ROOT, 'lib/states/ArmoryEngine.svelte.ts');
const SKILL_TREE_PAGE = join(ROOT, 'routes/(app)/player/skill-tree/+page.svelte');

const armoryEngineSrc = existsSync(ARMORY_ENGINE) ? readFileSync(ARMORY_ENGINE, 'utf-8') : '';
const skillTreePageSrc = existsSync(SKILL_TREE_PAGE) ? readFileSync(SKILL_TREE_PAGE, 'utf-8') : '';

describe('T1-7 — ArmoryEngine writes armory.stats to email-keyed users doc', () => {
	it('ArmoryEngine class declares a userKey $state field', () => {
		// The engine must maintain a distinct email-key field separate from the Firebase Auth UID.
		expect(armoryEngineSrc).toMatch(/userKey\s*=\s*\$state/);
	});

	it('loadPlayerData signature accepts uid + userKey parameters', () => {
		// Signature must include both uid (Auth UID) and userKey (email-based doc ID).
		expect(armoryEngineSrc).toMatch(/loadPlayerData\s*\(\s*uid\s*:\s*string\s*,\s*userKey\s*:\s*string\s*\)/);
	});

	it('loadPlayerData sets this.userKey from the email-key parameter', () => {
		// The engine must store the email key so sync methods can use it.
		expect(armoryEngineSrc).toMatch(/this\.userKey\s*=\s*userKey/);
	});

	it('_syncStat guard checks this.userKey — not this.userId', () => {
		// The guard that skips Firestore writes must check userKey presence.
		// If it still checked userId, a user whose UID != email key would write to the wrong doc.
		// Match _syncStat method declaration followed (within 300 chars) by the guard.
		expect(armoryEngineSrc).toMatch(/_syncStat[\s\S]{0,300}!this\.userKey/);
	});

	it('_syncXP guard checks this.userKey — not this.userId', () => {
		expect(armoryEngineSrc).toMatch(/_syncXP[\s\S]{0,300}!this\.userKey/);
	});

	it('_syncStat writes to doc(db, "users", this.userKey) — email-keyed path', () => {
		// The write must land in the same document the auth profile reader loads.
		expect(armoryEngineSrc).toMatch(/doc\s*\(\s*db\s*,\s*['"]users['"]\s*,\s*this\.userKey\s*\)/);
	});

	it('_syncXP writes to PATHS.users with this.userKey — not this.userId', () => {
		expect(armoryEngineSrc).toMatch(/PATHS\.users\s*,\s*this\.userKey/);
	});

	it('skill-tree page derives normalized email key and passes it to loadPlayerData', () => {
		// The call site must pass the lowercase-trimmed email as the second argument.
		expect(skillTreePageSrc).toMatch(/\.email.*?\.trim\(\)\.toLowerCase\(\)/);
		expect(skillTreePageSrc).toMatch(/loadPlayerData\s*\(\s*uid\s*,\s*userKey\s*\)/);
	});
});
