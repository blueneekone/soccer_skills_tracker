import { db } from '$lib/firebase.js';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import {
	applySixtyThirtyTenPalette,
	DEFAULT_PALETTE,
	paletteFromTeamBranding,
} from '$lib/player/dashboard/brandingPalette.js';

function createBrandingStore() {
	let appName = $state('SSTRACKER');
	let logoUrl = $state('');
	let primaryColor = $state(DEFAULT_PALETTE.dominant);
	let secondaryColor = $state(DEFAULT_PALETTE.accent);
	let structuralColor = $state(DEFAULT_PALETTE.structural);
	let bgUrl = $state('');
	let courtType = $state('soccer'); // 'soccer' | 'basketball'

	function applyToCss() {
		applySixtyThirtyTenPalette(
			paletteFromTeamBranding(primaryColor, secondaryColor),
		);
		if (structuralColor && structuralColor !== DEFAULT_PALETTE.structural) {
			document.documentElement.style.setProperty('--brand-structural', structuralColor);
		}
		if (bgUrl && bgUrl.trim()) {
			document.body.style.backgroundImage = `url('${bgUrl}')`;
			document.body.style.backgroundSize = 'cover';
			document.body.style.backgroundPosition = 'center';
			document.body.style.backgroundAttachment = 'fixed';
		}
	}

	return {
		get appName() { return appName; },
		get logoUrl() { return logoUrl; },
		get primaryColor() { return primaryColor; },
		get secondaryColor() { return secondaryColor; },
		get structuralColor() { return structuralColor; },
		get bgUrl() { return bgUrl; },
		get courtType() { return courtType; },

		async loadForTeam(teamId) {
			if (!teamId || teamId === 'admin') return;
			try {
				const snap = await getDoc(doc(db, 'config', `branding_${teamId}`));
				if (snap.exists()) {
					const data = snap.data();
					appName = data.appName || 'SSTRACKER';
					logoUrl = data.logoUrl || '';
					primaryColor = data.primaryColor || DEFAULT_PALETTE.dominant;
					secondaryColor = data.secondaryColor || DEFAULT_PALETTE.accent;
					structuralColor = data.structuralColor || DEFAULT_PALETTE.structural;
					bgUrl = data.bgUrl || '';
					courtType = data.courtType || 'soccer';
					applyToCss();
				}
			} catch (err) {
				console.error('[branding store] load error:', err);
			}
		},

		async saveForTeam(teamId, data) {
			await setDoc(doc(db, 'config', `branding_${teamId}`), { ...data, updatedAt: new Date() });
			appName = data.appName || appName;
			logoUrl = data.logoUrl || logoUrl;
			primaryColor = data.primaryColor || primaryColor;
			secondaryColor = data.secondaryColor || secondaryColor;
			structuralColor = data.structuralColor || structuralColor;
			bgUrl = data.bgUrl || bgUrl;
			courtType = data.courtType || courtType;
			applyToCss();
		},

		async resetForTeam(teamId) {
			await deleteDoc(doc(db, 'config', `branding_${teamId}`));
			appName = 'SSTRACKER';
			logoUrl = '';
			primaryColor = DEFAULT_PALETTE.dominant;
			secondaryColor = DEFAULT_PALETTE.accent;
			structuralColor = DEFAULT_PALETTE.structural;
			bgUrl = '';
			courtType = 'soccer';
			applyToCss();
		},

		/** Client-only: reset to defaults (e.g. after sign-out; no Firestore I/O). */
		resetLocalDefaults() {
			appName = 'SSTRACKER';
			logoUrl = '';
			primaryColor = DEFAULT_PALETTE.dominant;
			secondaryColor = DEFAULT_PALETTE.accent;
			structuralColor = DEFAULT_PALETTE.structural;
			bgUrl = '';
			courtType = 'soccer';
			if (typeof document !== 'undefined') {
				document.body.style.backgroundImage = '';
				document.body.style.backgroundSize = '';
				document.body.style.backgroundPosition = '';
				document.body.style.backgroundAttachment = '';
			}
			applyToCss();
		},
	};
}

export const brandingStore = createBrandingStore();
