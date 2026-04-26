/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	prefix: 'tw-',
	corePlugins: {
		preflight: false
	},
	theme: {
		extend: {
			// Player dashboard 3D card — literal `tw-perspective-1000` + back face rotation
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
