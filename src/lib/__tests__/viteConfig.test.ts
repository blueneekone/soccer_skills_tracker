import { describe, it, expect } from 'vitest';
import viteConfig from '../../../vite.config.js';

describe('Vite Pipeline & Caching Config', () => {
    it('should enforce cryptographic file-hash versioning without query-string cache-busting', () => {
        // Vite config can be a function or an object, wait, vite.config.js exports a function:
        // export default defineConfig(({ mode }) => ({ ...
        const config = typeof viteConfig === 'function' ? viteConfig({ mode: 'production', command: 'build' }) : viteConfig;
        
        const output = config.build?.rollupOptions?.output;
        
        expect(output).toBeDefined();
        
        // Assert that entry, chunk, and asset filenames use [hash]
        expect(output.entryFileNames).toContain('[hash]');
        expect(output.chunkFileNames).toContain('[hash]');
        expect(output.assetFileNames).toContain('[hash]');
        
        // Assert they don't contain ?v=
        expect(output.entryFileNames).not.toContain('?v=');
        expect(output.chunkFileNames).not.toContain('?v=');
        expect(output.assetFileNames).not.toContain('?v=');
    });
});
