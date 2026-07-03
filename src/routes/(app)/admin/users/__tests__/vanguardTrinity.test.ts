import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';

const APP_DIR = join(__dirname, '../../../../'); // points to src/routes/(app)

function findTrinity(dir: string): void {
	const files = readdirSync(dir);
	const hasPage = files.includes('+page.svelte');
	if (hasPage && files.some(f => f.endsWith('Engine.svelte.ts'))) {
		const pageContent = readFileSync(join(dir, '+page.svelte'), 'utf-8');
		const hasArena = pageContent.includes('Arena') || files.some(f => f.endsWith('Arena.svelte'));
		const hasHUD = pageContent.includes('HUD') || files.some(f => f.endsWith('HUD.svelte'));
		
		expect(hasArena, `Directory ${dir} has +page and Engine but missing Arena import/file`).toBe(true);
		expect(hasHUD, `Directory ${dir} has +page and Engine but missing HUD import/file`).toBe(true);
	}

	files.forEach(f => {
		const full = join(dir, f);
		if (statSync(full).isDirectory() && f !== '__tests__' && !f.startsWith('.')) {
			findTrinity(full);
		}
	});
}

describe('Vanguard Trinity Architecture (Sprint 1.1)', () => {
	it('enforces Shell, Brain, Glass, and HUD across all viewports', () => {
		findTrinity(APP_DIR);
	});
});
