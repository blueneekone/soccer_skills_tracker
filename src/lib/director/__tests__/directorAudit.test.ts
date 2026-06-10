import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pickDirectorClubId } from '$lib/director/pickDirectorClubId.js';

const ROOT = join(process.cwd(), 'src');

describe('pickDirectorClubId', () => {
	it('prefers context switcher club when valid', () => {
		const id = pickDirectorClubId(
			{ loaded: true, clubs: [{ id: 'c1' }, { id: 'c2' }] },
			{ userProfile: { clubId: 'c1' } },
			{ activeClubId: 'c2' },
		);
		expect(id).toBe('c2');
	});

	it('falls back to profile clubId', () => {
		const id = pickDirectorClubId(
			{ loaded: true, clubs: [{ id: 'c1' }] },
			{ userProfile: { clubId: 'c1' } },
			{ activeClubId: '' },
		);
		expect(id).toBe('c1');
	});
});

describe('Director audit guards — playbook + rules', () => {
	it('PlaybookTab supports edit and delete', () => {
		const src = readFileSync(join(ROOT, 'lib/components/director/PlaybookTab.svelte'), 'utf-8');
		expect(src).toMatch(/updateDoc/);
		expect(src).toMatch(/deleteDoc/);
		expect(src).toMatch(/startEdit/);
	});

	it('firestore.rules allows director-scoped club_playbooks', () => {
		const rules = readFileSync(join(process.cwd(), 'firestore.rules'), 'utf-8');
		expect(rules).toMatch(/match \/club_playbooks\/\{playbookId\}/);
		expect(rules).toMatch(/resource\.data\.clubId == tokenClub\(\)/);
	});

	it('CoachClearancePanopticon accepts clubId prop for context switcher', () => {
		const src = readFileSync(
			join(ROOT, 'lib/components/compliance/CoachClearancePanopticon.svelte'),
			'utf-8',
		);
		expect(src).toMatch(/clubIdProp|effectiveClubId/);
	});
});
