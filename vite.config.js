import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
	plugins: [
		sveltekit(),
	],

	/**
	 * Sprint 1.1 — content-hash asset versioning (.cursorrules asset_versioning).
	 * Paths align with SvelteKit's _app/immutable/ layout so adapter-static and
	 * service-worker.ts precache remain valid. Query-string cache-busting (?v=) is banned.
	 */
	build: {
		rollupOptions: {
			output: {
				entryFileNames: '_app/immutable/entry/[name].[hash].js',
				chunkFileNames: '_app/immutable/chunks/[name].[hash].js',
				assetFileNames: '_app/immutable/assets/[name].[hash][extname]',
			},
		},
	},

	/**
	 * Strip console.* and debugger statements from production builds.
	 * Keeps dev logs intact for development.
	 */
	esbuild: {
		drop: mode === 'production' ? ['console', 'debugger'] : [],
	},
}));
