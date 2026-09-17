import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import colorContrast from 'color-contrast';

describe('Void Density & WCAG 2.2 AA Accessibility Compliance', () => {
    
    it('should FAIL if any *Arena.svelte or +page.svelte uses light background tokens', () => {
        const files = glob.sync('src/**/*.{svelte}', { nodir: true });
        const targetFiles = files.filter(f => f.endsWith('Arena.svelte') || f.endsWith('+page.svelte'));
        
        const forbiddenTokens = ['bg-white', 'bg-gray-50', 'bg-slate-50', 'bg-neutral-50'];
        const failures: string[] = [];

        targetFiles.forEach(file => {
            const content = fs.readFileSync(file, 'utf-8');
            forbiddenTokens.forEach(token => {
                if (content.includes(token)) {
                    failures.push(`${file} contains forbidden token: ${token}`);
                }
            });
        });

        expect(failures, `Found light background tokens in Arena or Page components:\n${failures.join('\n')}`).toEqual([]);
    });

    it('should verify every palette pair meets 4.5:1 ratio', () => {
        const pairs = [
            { foreground: '#fafafa', background: '#0f172a' },
            { foreground: '#d4d4d8', background: '#000000' },
            { foreground: '#14b8a6', background: '#000000' },
            { foreground: '#fbbf24', background: '#000000' },
            { foreground: '#daff0a', background: '#000000' }
        ];

        pairs.forEach(pair => {
            const ratio = colorContrast(pair.foreground, pair.background);
            expect(ratio, `${pair.foreground} on ${pair.background} ratio is ${ratio}`).toBeGreaterThanOrEqual(4.5);
        });
    });

    it('should assert viewBox present on every SVG and no tw-text-[Npx] class inside SVG elements', () => {
        const files = glob.sync('src/**/*.svelte', { nodir: true });
        const svgFailures: string[] = [];
        
        files.forEach(file => {
            const content = fs.readFileSync(file, 'utf-8');
            if (content.includes('<svg')) {
                const svgTags = content.match(/<svg[^>]*>/g) || [];
                svgTags.forEach(svgTag => {
                    if (!svgTag.includes('viewBox')) {
                        svgFailures.push(`${file} contains SVG without viewBox: ${svgTag}`);
                    }
                });

                // Check for tw-text-[Npx] inside SVG elements, a bit tricky to parse HTML, we can just check if tw-text-[ appears between <svg and </svg>
                let svgBlockMatch;
                const svgBlockRegex = /<svg[\s\S]*?<\/svg>/g;
                while ((svgBlockMatch = svgBlockRegex.exec(content)) !== null) {
                    const block = svgBlockMatch[0];
                    if (block.match(/tw-text-\[\d+px\]/)) {
                        svgFailures.push(`${file} contains tw-text-[Npx] inside SVG: ${block.match(/tw-text-\[\d+px\]/)?.[0]}`);
                    }
                }
            }
        });
        
        expect(svgFailures, `SVG violations found:\n${svgFailures.join('\n')}`).toEqual([]);
    });
});
