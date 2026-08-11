import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Bento Grid & Typography Cohesion Tests', () => {
	const filesToTest = [
		'src/routes/(app)/admin/overview/AdminOverviewArena.svelte',
		'src/routes/(app)/director/dashboard/+page.svelte',
		'src/routes/(app)/coach/dashboard/+page.svelte',
		'src/routes/(app)/player/dashboard/+page.svelte',
		'src/routes/(app)/parent/dashboard/+page.svelte',
		'src/routes/fan/broadcast/+page.svelte',
		'src/routes/(app)/commissioner/dashboard/CommissionerDashboardArena.svelte'
	];

	it('should verify all dashboard layouts enforce asymmetric bento grid with fluid clamp math', () => {
		for (const relativePath of filesToTest) {
			const fullPath = join(process.cwd(), relativePath);
			const content = readFileSync(fullPath, 'utf-8');

			// Assert parent layout contains bento grid fluid clamp style
			expect(content).toContain('repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr))');
		}
	});

	it('should strictly forbid rgba() text opacities or Tailwind opacity text-white style modifiers on dark backgrounds', () => {
		for (const relativePath of filesToTest) {
			const fullPath = join(process.cwd(), relativePath);
			const content = readFileSync(fullPath, 'utf-8');

			// Check that no forbidden text styling classes like text-white/50 or text-slate-300/40 exist
			expect(content).not.toMatch(/tw-text-[a-z]+-\d+\/\d+/);
			expect(content).not.toMatch(/tw-text-white\/\d+/);
			expect(content).not.toMatch(/(?<!background-)color:\s*rgba\(/);
		}
	});

	it('should ensure no .st-bento class is defined on root grid wrapper containers to prevent false positive visual collisions', () => {
		for (const relativePath of filesToTest) {
			const fullPath = join(process.cwd(), relativePath);
			const content = readFileSync(fullPath, 'utf-8');

			// If it has a grid container, it must not apply st-bento directly on it.
			const lines = content.split('\n');
			for (const line of lines) {
				if (line.includes('grid-template-columns') || line.includes('bento-grid-container')) {
					expect(line).not.toContain('st-bento');
				}
			}
		}
	});
});
