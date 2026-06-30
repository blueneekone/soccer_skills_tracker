import { describe, it, expect } from 'vitest';
import configFn from './vite.config.js';

describe('Vite Configuration', () => {
	it('should configure cryptographic file-hash asset versioning', () => {
		const config = typeof configFn === 'function' ? configFn({ mode: 'production' }) : configFn;
		
		expect(config.build?.rollupOptions?.output?.entryFileNames).toContain('[hash]');
		expect(config.build?.rollupOptions?.output?.chunkFileNames).toContain('[hash]');
		expect(config.build?.rollupOptions?.output?.assetFileNames).toContain('[hash]');
	});
});
