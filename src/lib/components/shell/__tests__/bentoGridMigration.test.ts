import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Bento Grid Migration', () => {
    it.skip('EnterpriseConsoleShell should use padding-neutral 12-column Bento Grid topology', () => {
        const fileContent = readFileSync(join(process.cwd(), 'src/lib/components/shell/EnterpriseConsoleShell.svelte'), 'utf-8');
        expect(fileContent).toContain('bento-grid');
        expect(fileContent).toContain('bento-grid--12col');
    });

    it.skip('PlayerShell should use padding-neutral 12-column Bento Grid topology', () => {
        const fileContent = readFileSync(join(process.cwd(), 'src/lib/components/shell/PlayerShell.svelte'), 'utf-8');
        expect(fileContent).toContain('bento-grid');
        expect(fileContent).toContain('bento-grid--12col');
    });
});
