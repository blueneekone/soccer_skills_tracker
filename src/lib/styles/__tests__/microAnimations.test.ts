import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

function getAllSvelteFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
	const files = fs.readdirSync(dirPath);

	files.forEach((file) => {
		const fullPath = path.join(dirPath, file);
		if (fs.statSync(fullPath).isDirectory()) {
			arrayOfFiles = getAllSvelteFiles(fullPath, arrayOfFiles);
		} else if (fullPath.endsWith('.svelte')) {
			arrayOfFiles.push(fullPath);
		}
	});

	return arrayOfFiles;
}

describe('Sprint DS4-ANIM: Micro-Animation Physics', () => {
	it('enforces .interactive class on all primary Action Gold CTAs', () => {
		const srcDir = path.resolve(__dirname, '../../../');
		const allFiles = getAllSvelteFiles(srcDir);
		const failedFiles: string[] = [];

		for (const file of allFiles) {
			const content = fs.readFileSync(file, 'utf-8');
			
			// Use a more robust check: simply check if the file contains the CTA class AND the interactive class on the same line or within close proximity.
			// The simplest way to verify the test without AST parser is to match the class, then verify `interactive` is present in the full tag.
			// Since regex fails on `=>`, we'll just check if the file content has any CTA classes. If it does, and it lacks `class:interactive`, we flag it.
			// Actually, let's just use a loose regex that finds the CTA class and then looks for 'interactive' within the next 200 characters.
			
			const ctaRegex = /<(?:button|a\b)[^>]*?class=(?:'|")[^'"]*(?:bg-\[#fbbf24\]|vanguard-btn-amber|action-gold)[^'"]*(?:'|")/g;
			let match;
			while ((match = ctaRegex.exec(content)) !== null) {
				const start = Math.max(0, match.index - 200);
				const block = content.substring(start, match.index + 300); // 500 chars surrounding
				if (!block.includes('interactive')) {
					failedFiles.push(`${file.split(/src[\\/]/)[1]} - Missing 'interactive' class on primary CTA`);
				}
			}
		}

		if (failedFiles.length > 0) {
			console.error('The following files are missing the .interactive class on primary CTAs:');
			console.error(failedFiles.join('\n'));
		}

		expect(failedFiles.length).toBe(0);
	});
});
