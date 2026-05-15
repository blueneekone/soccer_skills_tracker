/**
 * Bauhaus SVG avatar generator — pure geometric, zero external dependencies.
 *
 * Deterministic from a string `seed`: same seed always produces the same SVG.
 * Inspired by the Bauhaus art school: primary shapes, bold flat colours, no ornamentation.
 *
 * The generator produces one of four composition variants (chosen by seed hash),
 * each built from 3–4 geometric primitives (circles, rectangles, polygons) drawn
 * over a solid background.  The colour palette rotates across a curated set of
 * eight perceptually-distinct hues — backgrounds and foregrounds are always distinct.
 */

/** @type {string[]} Perceptually-distinct Bauhaus palette. */
const PALETTE = [
	'#e63946', // Bauhaus red
	'#457b9d', // steel blue
	'#2a9d8f', // teal
	'#e9c46a', // amber
	'#264653', // dark slate
	'#f4a261', // sienna
	'#6a4c93', // violet
	'#1b998b', // viridian
];

/**
 * djb2 string → unsigned 32-bit hash.
 * @param {string} str
 * @returns {number}
 */
function djb2(str) {
	let h = 5381;
	for (let i = 0; i < str.length; i++) {
		h = (Math.imul(h, 33) ^ str.charCodeAt(i)) >>> 0;
	}
	return h;
}

/**
 * Linear congruential generator seeded by an integer.
 * Returns a function that yields floats in [0, 1).
 * @param {number} seed
 * @returns {() => number}
 */
function lcg(seed) {
	let s = (seed ^ 0xdeadbeef) >>> 0;
	return () => {
		s = (Math.imul(1664525, s) + 1013904223) >>> 0;
		return s / 0x100000000;
	};
}

/**
 * Pick a random element from an array without replacement tracking.
 * @template T
 * @param {T[]} arr
 * @param {() => number} rand
 * @returns {T}
 */
function pick(arr, rand) {
	return arr[Math.floor(rand() * arr.length)];
}

/**
 * Render a deterministic Bauhaus SVG avatar.
 *
 * @param {string} [seed]   Seed string — any stable unique identifier (e.g. UID, username).
 * @param {number} [size]   Square canvas size in pixels (default 128).
 * @returns {string}        Complete `<svg>` markup string — safe to use with `{@html}`.
 */
export function renderBauhausAvatarSvg(seed = 'operative', size = 128) {
	const rand = lcg(djb2(String(seed)));
	const u = size / 100; // 1 coordinate unit = u px

	// ── Colour selection (all distinct) ──────────────────────────────────────
	const bg = pick(PALETTE, rand);
	const remaining1 = PALETTE.filter((c) => c !== bg);
	const col1 = pick(remaining1, rand);
	const remaining2 = remaining1.filter((c) => c !== col1);
	const col2 = pick(remaining2, rand);
	const remaining3 = remaining2.filter((c) => c !== col2);
	const col3 = pick(remaining3, rand);

	// ── Composition variant (4 options, seeded) ───────────────────────────────
	const variant = Math.floor(rand() * 4);

	let shapes = '';

	if (variant === 0) {
		// Large circle (upper) + wide rectangle (lower) + accent dot
		const cx  = (25 + rand() * 50) * u;
		const cy  = (20 + rand() * 30) * u;
		const r   = (18 + rand() * 18) * u;
		const rx  = (5  + rand() * 15) * u;
		const ry  = (55 + rand() * 20) * u;
		const rw  = (50 + rand() * 40) * u;
		const rh  = (30 + rand() * 20) * u;
		const ax  = (60 + rand() * 30) * u;
		const ay  = (10 + rand() * 30) * u;
		const ar  = (6  + rand() * 10) * u;
		shapes = `
	<rect x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${rw.toFixed(1)}" height="${rh.toFixed(1)}" fill="${col1}"/>
	<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${col2}"/>
	<circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="${ar.toFixed(1)}" fill="${col3}"/>`;
	} else if (variant === 1) {
		// Horizontal band split + overlapping circle + small square
		const bandY = (30 + rand() * 30) * u;
		const cx    = (20 + rand() * 60) * u;
		const cy    = (15 + rand() * 55) * u;
		const r     = (18 + rand() * 20) * u;
		const sx    = (55 + rand() * 30) * u;
		const sy    = (55 + rand() * 30) * u;
		const sw    = (12 + rand() * 18) * u;
		shapes = `
	<rect x="0" y="${bandY.toFixed(1)}" width="${size}" height="${(size - bandY).toFixed(1)}" fill="${col1}"/>
	<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${col2}"/>
	<rect x="${sx.toFixed(1)}" y="${sy.toFixed(1)}" width="${sw.toFixed(1)}" height="${sw.toFixed(1)}" fill="${col3}"/>`;
	} else if (variant === 2) {
		// Vertical split + circle + accent circle
		const splitX = (25 + rand() * 40) * u;
		const cx     = (50 + rand() * 40) * u;
		const cy     = (25 + rand() * 50) * u;
		const r      = (18 + rand() * 20) * u;
		const ax     = (10 + rand() * 30) * u;
		const ay     = (55 + rand() * 30) * u;
		const ar     = (8  + rand() * 14) * u;
		shapes = `
	<rect x="0" y="0" width="${splitX.toFixed(1)}" height="${size}" fill="${col1}"/>
	<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${col2}"/>
	<circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="${ar.toFixed(1)}" fill="${col3}"/>`;
	} else {
		// Triangle (polygon) + lower circle + small accent circle
		const tx1 = (10 + rand() * 30) * u, ty1 = (10 + rand() * 20) * u;
		const tx2 = (60 + rand() * 30) * u, ty2 = (5  + rand() * 20) * u;
		const tx3 = (30 + rand() * 40) * u, ty3 = (55 + rand() * 25) * u;
		const cx  = (20 + rand() * 50) * u;
		const cy  = (60 + rand() * 30) * u;
		const r   = (15 + rand() * 20) * u;
		const ax  = (65 + rand() * 25) * u;
		const ay  = (55 + rand() * 30) * u;
		const ar  = (6  + rand() * 10) * u;
		shapes = `
	<polygon points="${tx1.toFixed(1)},${ty1.toFixed(1)} ${tx2.toFixed(1)},${ty2.toFixed(1)} ${tx3.toFixed(1)},${ty3.toFixed(1)}" fill="${col1}"/>
	<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${col2}"/>
	<circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="${ar.toFixed(1)}" fill="${col3}"/>`;
	}

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">\n\t<rect width="${size}" height="${size}" fill="${bg}"/>${shapes}\n</svg>`;
}
