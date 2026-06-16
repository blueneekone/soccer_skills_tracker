import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Content-Security-Policy: production (report-only) is set in firebase.json (hosting.headers), not here.

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// Notice the parentheses calling adapter()
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: 'index.html', // Crucial for Firebase SPA routing
			precompress: false,
			strict: true
		}),
		prerender: {
			// Deep-link anchors in FeatureBento (#rl-workouts, #skill-tree, etc.)
			// target IDs on /features that will be wired in a future sprint.
			// Warn rather than error so the marketing landing build does not block.
			handleMissingId: 'warn',
			handleHttpError: ({ path, message }) => {
				// Acquisition PDFs are generated post-build via npm run build:acquisition-pdfs
				if (path.startsWith('/acquisition/sstracker-') && path.endsWith('.pdf')) {
					return;
				}
				throw new Error(message);
			},
		}
	},
	preprocess: vitePreprocess()
};

export default config;