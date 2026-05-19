/**
 * Maps director / club branding picks to the 60-30-10 CSS variable stack.
 * Consumed by branding stores on load/save — browser-only side effect.
 */

export const DEFAULT_PALETTE = Object.freeze({
	dominant: '#0f172a',
	structural: '#3b82f6',
	accent: '#fbbf24',
});

export type BrandingPaletteInput = {
	dominant?: string;
	structural?: string;
	accent?: string;
};

function isHexColor(v: string): boolean {
	return /^#[0-9A-Fa-f]{6}$/.test(v);
}

/**
 * Apply --brand-dominant / --brand-structural / --brand-accent (feeds --color-* in app.css).
 */
export function applySixtyThirtyTenPalette(input: BrandingPaletteInput = {}): void {
	if (typeof document === 'undefined') return;

	const dominant = isHexColor(input.dominant ?? '') ? input.dominant! : DEFAULT_PALETTE.dominant;
	const structural = isHexColor(input.structural ?? '') ? input.structural! : DEFAULT_PALETTE.structural;
	const accent = isHexColor(input.accent ?? '') ? input.accent! : DEFAULT_PALETTE.accent;

	const root = document.documentElement;
	root.style.setProperty('--brand-dominant', dominant);
	root.style.setProperty('--brand-structural', structural);
	root.style.setProperty('--brand-accent', accent);

	// Legacy aliases used across the app shell
	root.style.setProperty('--aggie-blue', dominant);
	root.style.setProperty('--aggie-gold', accent);
	root.style.setProperty('--brand-primary', dominant);
}

/**
 * Team branding: primary = dominant 60%, secondary = accent 10%, structural defaults to blue.
 */
export function paletteFromTeamBranding(primaryColor: string, secondaryColor: string): BrandingPaletteInput {
	return {
		dominant: primaryColor,
		accent: secondaryColor,
		structural: DEFAULT_PALETTE.structural,
	};
}

/**
 * Club branding: brandPrimaryHex = dominant, brandAccentHex = accent.
 */
export function paletteFromClubBranding(brandPrimaryHex: string, brandAccentHex: string): BrandingPaletteInput {
	return paletteFromTeamBranding(brandPrimaryHex, brandAccentHex);
}
