import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(process.cwd(), 'src');
const NAV = join(ROOT, 'lib/shell/workspaceNav.js');
const TACTICS_BOARD_PAGE = join(ROOT, 'routes/(app)/coach/tactics-board/+page.svelte');

describe('WARROOM-SINGLE-SURFACE guards', () => {
	it('workspaceNav links War Room to /coach/tactical, not tactics-board', () => {
		const nav = readFileSync(NAV, 'utf-8');
		expect(nav).toMatch(/label:\s*'War Room'/);
		expect(nav).toMatch(/href:\s*'\/coach\/tactical'/);
		expect(nav).not.toMatch(/href:\s*'\/coach\/tactics-board'/);
	});

	it('tactics-board route redirects to /coach/tactical preserving search params', () => {
		const src = readFileSync(TACTICS_BOARD_PAGE, 'utf-8');
		expect(src).toMatch(/goto\(/);
		expect(src).toMatch(/\/coach\/tactical/);
		expect(src).toMatch(/replaceState:\s*true/);
		expect(src).not.toMatch(/CoachTacticsBoardView|TacticalCommandBoard/);
	});
});
