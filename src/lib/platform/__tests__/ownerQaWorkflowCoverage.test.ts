import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');
const REGISTRY = join(ROOT, '..', 'docs/vision/PRODUCT_SURFACE_REGISTRY.md');
const CHECKLIST = join(ROOT, '..', 'docs/vision/OWNER_QA_CHECKLIST.md');
const WORKFLOW_CANON = join(ROOT, '..', 'docs/vision/PLATFORM_WORKFLOW_CANON.md');

/** Parse qa_ids column from registry §1 Tier 1 rows */
function parseTier1QaIds(registrySrc: string): Map<string, string[]> {
	const section = registrySrc.split('## §1 Master table')[1]?.split('## §2')[0] ?? '';
	const map = new Map<string, string[]>();
	for (const line of section.split('\n').filter((l) => l.startsWith('| PS-'))) {
		const cols = line
			.split('|')
			.map((c) => c.trim())
			.filter(Boolean);
		if (Number(cols[4]) !== 1) continue;
		const id = cols[0];
		const qaRaw = cols[7];
		const qaIds = qaRaw
			.split(/[,·]/)
			.flatMap((part) => {
				const trimmed = part.trim();
				const range = trimmed.match(/^QA-(\d+)–QA-(\d+)$/);
				if (range) {
					const start = Number(range[1]);
					const end = Number(range[2]);
					return Array.from({ length: end - start + 1 }, (_, i) => `QA-${start + i}`);
				}
				const dashRange = trimmed.match(/^QA-(\d+)–(\d+)$/);
				if (dashRange) {
					const start = Number(dashRange[1]);
					const end = Number(dashRange[2]);
					return Array.from({ length: end - start + 1 }, (_, i) => `QA-${start + i}`);
				}
				const matches = trimmed.match(/QA-\d+[a-z]?|QA-NAV-\d+/g);
				return matches ?? (trimmed.startsWith('QA-') ? [trimmed] : []);
			})
			.filter(Boolean);
		map.set(id, qaIds);
	}
	return map;
}

/** GP-ACQ step ids from workflow canon §2 (and §8 audit — same step_ids) */
function parseGpAcqStepIds(canonSrc: string): string[] {
	const all = [...canonSrc.matchAll(/\|\s*(GP-ACQ-0\d+[a-z]?)\s*\|/g)].map((m) => m[1]);
	return [...new Set(all)];
}

describe('OWNER_QA_CHECKLIST workflow coverage guards', () => {
	const registrySrc = readFileSync(REGISTRY, 'utf-8');
	const checklistSrc = readFileSync(CHECKLIST, 'utf-8');
	const canonSrc = readFileSync(WORKFLOW_CANON, 'utf-8');
	const tier1QaIds = parseTier1QaIds(registrySrc);

	it('every Tier 1 registry qa_id appears in OWNER_QA_CHECKLIST.md', () => {
		const missing: string[] = [];
		for (const [registryId, qaIds] of tier1QaIds) {
			for (const qaId of qaIds) {
				if (!checklistSrc.includes(qaId)) {
					missing.push(`${registryId}: ${qaId}`);
				}
			}
		}
		expect(missing, `missing qa_ids: ${missing.join(', ')}`).toEqual([]);
	});

	it('every GP-ACQ step_id from workflow canon §2 appears in checklist', () => {
		const gpAcqSteps = parseGpAcqStepIds(canonSrc);
		expect(gpAcqSteps.length).toBeGreaterThanOrEqual(6);
		const missing = gpAcqSteps.filter((step) => !checklistSrc.includes(step));
		expect(missing, `missing GP-ACQ steps: ${missing.join(', ')}`).toEqual([]);
	});

	it('Phase 4b references PLATFORM_NAVIGATION_CANON.md', () => {
		expect(checklistSrc).toContain('## Phase 4b — Platform navigation chrome');
		expect(checklistSrc).toContain('PLATFORM_NAVIGATION_CANON.md');
		expect(checklistSrc).toMatch(/QA-NAV-0[1-7]/);
	});

	it('checklist has workflow map sections (Tier 1 matrix + gold path index)', () => {
		expect(checklistSrc).toContain('## Platform workflow map');
		expect(checklistSrc).toContain('### Tier 1 coverage matrix');
		expect(checklistSrc).toContain('### Gold path step index');
		expect(checklistSrc).toContain('## Phase 13 — Full platform workflow sweep');
	});

	it('checklist does not contain stale nav / structure sprint strings', () => {
		const stalePatterns = [
			/7-icon/i,
			/STRUCTURE-Forge-impl/,
			/QA status: PAUSED \(structure sprint\)/,
		];
		for (const pattern of stalePatterns) {
			expect(checklistSrc, `stale pattern ${pattern}`).not.toMatch(pattern);
		}
		// IntentHUD only allowed in historical/superseded context — not as current blocker
		expect(checklistSrc).not.toMatch(/IntentHUD.*blocker/i);
	});

	it('Tier 1 count is 15 in coverage matrix', () => {
		const matrixSection = checklistSrc.split('### Tier 1 coverage matrix')[1]?.split('### Gold path')[0] ?? '';
		const tier1Rows = matrixSection.split('\n').filter((l) => l.startsWith('| PS-'));
		expect(tier1Rows.length).toBe(15);
	});
});
