import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../..');

// Helper to find all +page.svelte and *Arena.svelte files
function findTargetFiles(dir: string, fileList: string[] = []): string[] {
	const files = fs.readdirSync(dir);

	for (const file of files) {
		const filePath = path.join(dir, file);
		const stat = fs.statSync(filePath);

		if (stat.isDirectory()) {
			if (file !== 'node_modules' && file !== '.svelte-kit') {
				findTargetFiles(filePath, fileList);
			}
		} else {
			if (file === '+page.svelte' || (file.endsWith('Arena.svelte') && file !== 'Arena.svelte')) {
				fileList.push(filePath);
			}
		}
	}

	return fileList;
}

describe('Sprint DS3: Action Gold CTA Governance & Viewport Governor', () => {
	const targetFiles = findTargetFiles(path.join(rootDir, 'src'));

	it('should ensure no +page.svelte or *Arena.svelte file contains more than ONE primary Action Gold CTA', () => {
		const violations: { file: string; count: number }[] = [];

		for (const file of targetFiles) {
			const content = fs.readFileSync(file, 'utf-8');
			
			// Match patterns for Action Gold backgrounds (Tailwind hex, CSS variable, or custom class)
			const matches = content.match(/tw-bg-\\[\\#fbbf24\\]|var\\(--color-gold\\)|action-gold|bg-action-gold/g);
			
			if (matches && matches.length > 1) {
				violations.push({
					file: path.relative(rootDir, file),
					count: matches.length
				});
			}
		}

		if (violations.length > 0) {
			console.error('Files violating Action Gold CTA Governance (max 1 per viewport):');
			violations.forEach(v => console.error(-  + v.file +  ( + v.count +  instances)));
		}

		expect(violations.length).toBe(0);
	});
});
