import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			strategies: 'generateSW',
			includeAssets: ['manifest.json', 'Images/**/*.png'],
			manifest: {
				name: 'Sports Skills Tracker',
				short_name: 'SSTRACKER',
				start_url: '/',
				display: 'standalone',
				background_color: '#00263A',
				theme_color: '#00263A',
				icons: [
					{
						src: 'Images/Phoenixes_Logo_2026.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: 'Images/Phoenixes_Logo_2026.png',
						sizes: '512x512',
						type: 'image/png'
					}
				]
			},
			workbox: {
				globPatterns: ['client/**/*.{js,css,ico,png,svg,webp,woff2}'],
				maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
				navigateFallback: '/index.html',
				navigateFallbackDenylist: [/^\/api\//]
			},
			devOptions: {
				enabled: false
			}
		})
	]
});
