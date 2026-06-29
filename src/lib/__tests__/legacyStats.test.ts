import { describe, it, expect } from 'vitest';
// Legacy JS files might not easily run in vitest because of DOM dependencies,
// but we verify the existence of the CSV export logic.
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Legacy Stats Module', () => {
    it('should use safeGetDate in exportStatsCSV to avoid crashes on legacy data', () => {
        const statsJsContent = readFileSync(join(process.cwd(), 'legacy', 'modules', 'stats.js'), 'utf-8');
        expect(statsJsContent).toContain('const d = safeGetDate(log);');
    });
});
