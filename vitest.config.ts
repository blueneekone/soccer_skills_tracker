import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
	plugins: [
		// Required so Vitest can transform .svelte files for jsdom render tests.
		// Node-environment tests (CSS-source, logic) are unaffected.
		svelte({ hot: !process.env.VITEST }),
	],
	resolve: {
		// Prefer browser exports so Svelte 5 `mount()` uses the DOM build,
		// not `index-server.js`, in jsdom-environment tests.
		conditions: ['browser', 'import', 'module', 'default'],
	},
	test: {
		environment: 'node',
		include: [
			'src/**/__tests__/**/*.test.ts',
			'docs/**/__tests__/**/*.test.ts',
			'scripts/**/__tests__/**/*.test.ts',
		],
		alias: {
			$lib: resolve(__dirname, 'src/lib'),
			$app: resolve(__dirname, 'src/app-stubs'),
		},
	},
});
