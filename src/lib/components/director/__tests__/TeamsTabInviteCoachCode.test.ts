import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(process.cwd(), 'src');
const TEAMS_TAB = join(ROOT, 'lib/components/director/TeamsTab.svelte');
const SQUAD_MANAGER = join(ROOT, 'lib/components/director/SquadManager.svelte');

describe('TeamsTab & SquadManager Coach Invite Integration', () => {
	it('TeamsTab.svelte calls directorInviteCoach Cloud Function for coach invites', () => {
		const src = readFileSync(TEAMS_TAB, 'utf8');
		expect(src).toMatch(/httpsCallable\(functions,\s*'directorInviteCoach'\)/);
		expect(src).toMatch(/directorInviteCoach/);
	});

	it('SquadManager.svelte calls directorInviteCoach Cloud Function when assigning a coach', () => {
		const src = readFileSync(SQUAD_MANAGER, 'utf8');
		expect(src).toMatch(/httpsCallable\(functions,\s*'directorInviteCoach'\)/);
		expect(src).toMatch(/directorInviteCoach/);
	});
});
