import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
	plugins: [
		sveltekit(),

		VitePWA({
			/**
			 * `injectManifest` strategy: we supply our own sw.js so it can share
			 * the FCM service worker scope without conflicting.  Workbox precaches
			 * the app-shell assets; runtime caching handles API and image requests.
			 */
			strategies: 'injectManifest',
			srcDir: 'src',
			filename: 'sw.js',

			/** Path of the web-app manifest already in /static */
			manifest: false, // We manage static/manifest.json manually

			/**
			 * Registration is handled by our own InstallPrompt.svelte so we can
			 * show the custom Vanguard-themed banner before prompting.
			 */
			registerType: 'prompt',
			injectRegister: null, // handled by InstallPrompt.svelte

			devOptions: {
				enabled: false, // Disable SW in dev to avoid interfering with HMR
			},

			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
			},
		}),
	],

	/**
	 * Strip console.* and debugger statements from production builds.
	 * Keeps dev logs intact for development.
	 */
	esbuild: {
		drop: mode === 'production' ? ['console', 'debugger'] : [],
	},
}));
