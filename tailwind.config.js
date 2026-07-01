/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	prefix: 'tw-',
	corePlugins: {
		preflight: false
	},
	darkMode: 'class',
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
				bg:      'var(--vanguard-bg)',       // #0f172a — Slate-900 global background
				accent:  'var(--vanguard-accent)',   // #14b8a6 — muted teal, replaces neon cyan
				cyan:    'var(--vanguard-accent)',   // DEPRECATED alias → accent
				red:     '#ff003c',                  // Ares Red / Danger / Errors
				glass:   'var(--vanguard-glass)',    // Floating surfaces only
				border:  'var(--vanguard-border)',   // Slate-400 @ 12% — thin, low-contrast
				surface: 'var(--vanguard-surface)',  // Opaque card fill
			},
			void: {
				black: 'var(--void-black)',
				obsidian: 'var(--obsidian)',
			},
			tron: {
				legacy: 'var(--legacy-cyan)',
				ares: 'var(--ares-crimson)',
			},
			/** Tactical teal scale — replaces the neon Tron cyan override */
			teal: {
				50:  '#f0fdfa',
				100: '#ccfbf1',
				200: '#99f6e4',
				300: '#5eead4',
				400: '#2dd4bf',
				500: '#14b8a6',
				600: '#0d9488',
				700: '#0f766e',
				800: '#115e59',
				900: '#134e4a',
				950: '#042f2e',
			},
			},
	boxShadow: {
		'tron-ares':         'var(--ares-glow)',      /* Critical state — crimson only */
		'vanguard-card':     'var(--vanguard-elev-2)',
		'vanguard-red':      '0 0 15px rgba(255, 0, 60, 0.4)',
		'vanguard-elev-1':   'var(--vanguard-elev-1)',
		'vanguard-elev-2':   'var(--vanguard-elev-2)',
		'vanguard-elev-3':   'var(--vanguard-elev-3)',
		'vanguard-elev-ares':'var(--vanguard-elev-ares)',
	},
		borderRadius: {
			vanguard:       'var(--vanguard-radius)',
			'vanguard-sm':  'var(--vanguard-radius-sm)',
			'vanguard-md':  'var(--vanguard-radius-md)',
			'vanguard-xs':  'var(--vanguard-radius-xs)',
		},
		backdropBlur: {
			'vanguard-sm': 'var(--vanguard-blur-sm)',
			'vanguard':    'var(--vanguard-blur)',
			'vanguard-lg': 'var(--vanguard-blur-lg)',
		},
		fontFamily: {
			sans: ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
			mono: ['Geist Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
		},
		transitionDuration: {
			fast: '150ms',
			base: '200ms',
			slow: '250ms',
		},
		// Player dashboard 3D card — literal `tw-perspective-1000` + back face rotation
		spacing: {
				/** Reserved shell height subtracted in Coach Workspace `calc(100vh - …)` */
				header: 'var(--vanguard-shell-header, 5rem)',
			/** Bento Grid fluid spacing — compose with tw-gap-*, tw-p-*, tw-m-* */
			'bento-xs':  'var(--bento-gap-xs)',
			'bento-sm':  'var(--bento-gap-sm)',
			'bento-md':  'var(--bento-gap-md)',
			'bento-lg':  'var(--bento-gap-lg)',
			'bento-pad': 'var(--bento-pad)',
			'bento-pad-sm': 'var(--bento-pad-sm)',
			/** Sprint 1.1 Liquid Bento — clamp(20px, 4vw, 32px) */
			'bento-liquid': 'var(--bento-gap-liquid)',
			'bento-pad-liquid': 'var(--bento-pad-liquid)',
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
