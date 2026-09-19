import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Sprint DS2: Navy Slate Z2 Panel Enforcement (Static Assertion)', () => {
	function getAllSvelteFiles(dirPath: string, arrayOfFiles: string[] = []) {
		const files = fs.readdirSync(dirPath);

		files.forEach((file) => {
			const fullPath = path.join(dirPath, file);
			if (fs.statSync(fullPath).isDirectory()) {
				arrayOfFiles = getAllSvelteFiles(fullPath, arrayOfFiles);
			} else {
				if (fullPath.endsWith('.svelte')) {
					arrayOfFiles.push(fullPath);
				}
			}
		});

		return arrayOfFiles;
	}

	const allFiles = getAllSvelteFiles(path.join(process.cwd(), 'src'));

	it('should strictly enforce the Nuclear Americana Tech Noir palette and ban generic tailwind colors', () => {
		const bannedPatterns = [
			{ regex: /\bbg-white\b/g, error: 'bg-white is banned. Use void or slate tokens.' },
			{ regex: /\bbg-black\b/g, error: 'bg-black is banned. Use void or slate tokens.' },
			{ regex: /\btext-white\b/g, error: 'text-white is banned. Use text-[#fafafa].' },
			{ regex: /\btext-black\b/g, error: 'text-black is banned. Use text-[#000000].' },
			{ regex: /#ffffff/g, error: '#ffffff is banned to prevent halation. Use #fafafa.' },
			{ regex: /#ff0000|#00ff00|#0000ff/gi, error: 'Raw primary hues (#ff0000, etc) are banned.' },
			{ regex: /\btw-bg-blue-\d{3,4}\b/g, error: 'tw-bg-blue-* generic colors are banned. Use Data Cyan (#14b8a6).' },
			{ regex: /\btw-bg-red-\d{3,4}\b/g, error: 'tw-bg-red-* generic colors are banned. Use Atompunk Amber (#f59e0b).' },
			{ regex: /\btw-bg-purple-\d{3,4}\b/g, error: 'tw-bg-purple-* generic colors are banned.' },
			{ regex: /\btw-bg-green-\d{3,4}\b/g, error: 'tw-bg-green-* generic colors are banned. Use Data Cyan (#14b8a6).' },
			{ regex: /rgba\(\s*0\s*,\s*255\s*,\s*255/g, error: 'Raw Cyan (0,255,255) is banned. Use Data Cyan token.' },
			{ regex: /rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*1\s*\)/g, error: 'rgba(0,0,0,1) is banned. Use #000000 token.' }
		];

		const violations: string[] = [];

		allFiles.forEach((file) => {
			// Skip the test file itself or any test files if they end up being picked up
			if (file.includes('__tests__')) return;

			const content = fs.readFileSync(file, 'utf-8');

			bannedPatterns.forEach((pattern) => {
				const match = content.match(pattern.regex);
				if (match) {
					// Collect violations to output them all at once
					violations.push(`File: ${file} \nViolation: '${match[0]}' \nReason: ${pattern.error}\n`);
				}
			});
		});

		if (violations.length > 0) {
			console.error(`\n--- PALETTE ENFORCEMENT FAILURES (${violations.length}) ---\n`);
			violations.forEach(v => console.error(v));
			throw new Error(`Found ${violations.length} palette violations. Fix them to pass Sprint DS2.`);
		}

		expect(violations.length).toBe(0);
	});
});
