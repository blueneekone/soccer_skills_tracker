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
				/**
				 * Vanguard Protocol Design Token Dictionary
				 * ──────────────────────────────────────────
				 * Canonical brand palette. Use these semantic tokens in all new
				 * components instead of raw Tailwind color scales.
				 *
				 * CSS variable counterparts live in :root in app.css.
				 */
				vanguard: {
					bg:     '#010409',              // Deep Obsidian — global background
					cyan:   '#00f0ff',              // Primary Glow / Success / XP
					red:    '#ff003c',              // Ares Red / Danger / Errors
					glass:  'var(--vanguard-glass)',  // rgba(255,255,255,0.03) — glassmorphism base
					border: 'var(--vanguard-border)', // rgba(0,240,255,0.2) — subtle cyan border
				},
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
				'tron-legacy':    'var(--legacy-glow)',
				'tron-ares':      'var(--ares-glow)',
				'vanguard-card':  '0 0 15px rgba(0, 240, 255, 0.05)',
				'vanguard-glow':  '0 0 15px rgba(0, 240, 255, 0.4)',
				'vanguard-red':   '0 0 15px rgba(255, 0, 60, 0.4)',
			},
			// Player dashboard 3D card — literal `tw-perspective-1000` + back face rotation
			spacing: {
				/** Reserved shell height subtracted in Coach Workspace `calc(100vh - …)` */
				header: 'var(--vanguard-shell-header, 5rem)',
			},
			perspective: {
				1000: '1000px',
			},
			zIndex: {
				15: '15',
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
