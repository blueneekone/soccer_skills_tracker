import { browser } from '$app/environment';
import { db } from '$lib/firebase.js';
import { doc, onSnapshot } from 'firebase/firestore';

/**
 * Club-wide branding from `clubs/{clubId}` (logo + hex) for app shell + Director OS.
 */
function createClubBrandingStore() {
	let logoUrl = $state('');
	let clubIdSub = $state('');
	/** @type {(() => void) | null} */
	let unsub = null;

	function applyToDocument() {
		if (!browser || typeof document === 'undefined') return;
		document.documentElement.style.setProperty(
			'--club-logo-url',
			logoUrl ? `url("${logoUrl}")` : 'none'
		);
	}

	function clear() {
		if (unsub) {
			unsub();
			unsub = null;
		}
		clubIdSub = '';
		logoUrl = '';
		applyToDocument();
	}

	/**
	 * @param {string | undefined | null} cid
	 */
	function loadForClub(cid) {
		if (!browser) return;
		const id = typeof cid === 'string' ? cid.trim() : '';
		if (!id) {
			clear();
			return;
		}
		if (id === clubIdSub && unsub) return;

		if (unsub) {
			unsub();
			unsub = null;
		}
		clubIdSub = id;

		const ref = doc(db, 'clubs', id);
		unsub = onSnapshot(
			ref,
			(snap) => {
				if (!snap.exists()) {
					logoUrl = '';
					applyToDocument();
					return;
				}
				const d = snap.data();
				const u = typeof d.brandLogoUrl === 'string' ? d.brandLogoUrl.trim() : '';
				logoUrl = u;
				const p = typeof d.brandPrimaryHex === 'string' ? d.brandPrimaryHex : '';
				const a = typeof d.brandAccentHex === 'string' ? d.brandAccentHex : '';
				if (browser && typeof document !== 'undefined') {
					if (/^#[0-9A-Fa-f]{6}$/.test(p)) {
						document.documentElement.style.setProperty('--brand-primary', p);
					}
					if (/^#[0-9A-Fa-f]{6}$/.test(a)) {
						document.documentElement.style.setProperty('--brand-accent', a);
					}
				}
				applyToDocument();
			},
			(err) => {
				console.error('[clubBranding]', err);
			}
		);
	}

	return {
		get logoUrl() {
			return logoUrl;
		},
		get clubId() {
			return clubIdSub;
		},
		loadForClub,
		clear,
		applyToDocument
	};
}

export const clubBrandingStore = createClubBrandingStore();
