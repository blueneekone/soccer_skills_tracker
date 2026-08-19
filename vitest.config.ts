import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
	plugins: [
		svelte({ hot: !process.env.VITEST }),
	],
	resolve: {
		conditions: ['browser', 'import', 'module', 'default'],
	},
	test: {
		setupFiles: ['./src/setup/vitest.setup.ts'],
		globals: true,
		environment: 'node',
		include: [
			'src/**/__tests__/**/*.test.ts',
			'src/routes/**/tests/**/*.test.ts',
			'src/routes/**/__tests__/**/*.test.ts',
			'docs/**/__tests__/**/*.test.ts',
			'scripts/**/__tests__/**/*.test.ts',
			'functions/src/__tests__/**/*.test.ts',
		],
		alias: {
			$lib: resolve(__dirname, 'src/lib'),
			$app: resolve(__dirname, 'src/app-stubs'),
		},
	},
});
