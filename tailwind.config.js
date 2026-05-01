/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	prefix: 'tw-',
	corePlugins: {
		preflight: false
	},
	theme: {
		extend: {
			colors: {
				void: {
					black: 'var(--void-black)',
					obsidian: 'var(--obsidian)',
				},
				tron: {
					legacy: 'var(--legacy-cyan)',
					ares: 'var(--ares-crimson)',
				},
				/** Vanguard lockstep: all Tailwind `cyan-*` utilities resolve to Legacy Tron cyan (#00f0ff family). */
				cyan: {
					50: '#ecfeff',
					100: '#cffafe',
					200: '#a5f3fc',
					300: '#67e8f9',
					400: '#00f0ff',
					500: '#00f0ff',
					600: '#00c9dc',
					700: '#009eae',
					800: '#065a66',
					900: '#073940',
					950: '#031016',
				},
			},
			boxShadow: {
				'tron-legacy': 'var(--legacy-glow)',
				'tron-ares': 'var(--ares-glow)',
			},
			// Player dashboard 3D card — literal `tw-perspective-1000` + back face rotation
			spacing: {
				/** Reserved shell height subtracted in Coach Workspace `calc(100vh - …)` */
				header: 'var(--vanguard-shell-header, 5rem)',
			},
			perspective: {
				1000: '1000px',
			},
			rotate: {
				'y-180': 'rotateY(180deg)',
			},
		},
	},
	plugins: [
		({ addUtilities }) => {
			addUtilities({
				// tw-preserve-3d (prefixed) — 3D flip children need transform-style: preserve-3d
				'.preserve-3d': { transformStyle: 'preserve-3d' },
			});
		},
	],
};
