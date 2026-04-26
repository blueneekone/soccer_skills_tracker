import { db } from '$lib/firebase.js';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

function createBrandingStore() {
	let appName = $state('SSTRACKER');
	let logoUrl = $state('');
	let primaryColor = $state('#0f172a');
	let secondaryColor = $state('#fbbf24');
	let bgUrl = $state('');

	function applyToCss() {
		if (typeof document === 'undefined') return;
		document.documentElement.style.setProperty('--aggie-blue', primaryColor);
		document.documentElement.style.setProperty('--aggie-gold', secondaryColor);
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
		get bgUrl() { return bgUrl; },

		async loadForTeam(teamId) {
			if (!teamId || teamId === 'admin') return;
			try {
				const snap = await getDoc(doc(db, 'config', `branding_${teamId}`));
				if (snap.exists()) {
					const data = snap.data();
					appName = data.appName || 'SSTRACKER';
					logoUrl = data.logoUrl || '';
					primaryColor = data.primaryColor || '#0f172a';
					secondaryColor = data.secondaryColor || '#fbbf24';
					bgUrl = data.bgUrl || '';
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
			bgUrl = data.bgUrl || bgUrl;
			applyToCss();
		},

		async resetForTeam(teamId) {
			await deleteDoc(doc(db, 'config', `branding_${teamId}`));
			appName = 'SSTRACKER';
			logoUrl = '';
			primaryColor = '#0f172a';
			secondaryColor = '#fbbf24';
			bgUrl = '';
			applyToCss();
		},

		/** Client-only: reset to defaults (e.g. after sign-out; no Firestore I/O). */
		resetLocalDefaults() {
			appName = 'SSTRACKER';
			logoUrl = '';
			primaryColor = '#0f172a';
			secondaryColor = '#fbbf24';
			bgUrl = '';
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
