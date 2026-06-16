/**
 * registrationRosterDragDrop.test.ts — Wave 4 B-03 GotSport-style drag-drop guards
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(process.cwd());
const PANEL = join(ROOT, 'src/lib/components/director/RegistrationRosterAssignPanel.svelte');
const LICENSES = join(ROOT, 'src/lib/components/director/LicensesTab.svelte');

describe('comp-roster-dragdrop — B-03 registration → roster drag-drop', () => {
	it('Licenses tab mounts RegistrationRosterAssignPanel on Roster path', () => {
		const tab = readFileSync(LICENSES, 'utf8');
		expect(tab).toMatch(/RegistrationRosterAssignPanel/);
	});

	it('panel exposes draggable registrant pool and team drop zones', () => {
		const src = readFileSync(PANEL, 'utf8');
		expect(src).toMatch(/reg-roster-dnd/);
		expect(src).toMatch(/draggable=\{/);
		expect(src).toMatch(/ondragstart/);
		expect(src).toMatch(/ondragover/);
		expect(src).toMatch(/ondrop/);
		expect(src).toMatch(/reg-roster-dnd__slot/);
		expect(src).toMatch(/reg-roster-dnd__pool/);
	});

	it('persists assignment via assignSeasonRegistrationToRoster callable', () => {
		const src = readFileSync(PANEL, 'utf8');
		expect(src).toMatch(/assignSeasonRegistrationToRoster/);
		expect(src).toMatch(/season_registrations/);
		expect(src).toMatch(/paymentStatus', '==', 'paid'/);
	});

	it('blocks name-only registrants with add-email hint (LAUNCH-forge-nameonly parity)', () => {
		const src = readFileSync(PANEL, 'utf8');
		expect(src).toMatch(/add email to assign/i);
		expect(src).toMatch(/isNameOnly/);
		expect(src).toMatch(/name-only/i);
	});

	it('keeps select-and-assign fallback for accessibility', () => {
		const src = readFileSync(PANEL, 'utf8');
		expect(src).toMatch(/reg-roster-panel__assign/);
		expect(src).toMatch(/reg-roster-panel__select/);
	});
});
