import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		setupFiles: ['./src/setup/vitest.setup.ts'],
		globals: true,
		include: ['src/**/*.{test,spec}.{js,ts}'],
		exclude: ['e2e/**', 'tests/**', 'functions/**', 'functions-integrations/**', 'node_modules/**'],
		environment: 'jsdom'
	},
	resolve: {
		conditions: ['mode="test"', 'browser']
	}
});
