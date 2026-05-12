import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Content-Security-Policy: production (report-only) is set in firebase.json (hosting.headers), not here.

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		runes: true,
	},
	kit: {
		// Notice the parentheses calling adapter()
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: 'index.html', // Crucial for Firebase SPA routing
			precompress: false,
			strict: true
		})
	},
	preprocess: vitePreprocess()
};

export default config;