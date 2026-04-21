import { browser } from '$app/environment';
import { db } from '$lib/firebase.js';
import { doc, onSnapshot } from 'firebase/firestore';

/**
 * Club-wide branding from `clubs/{clubId}` (logo + hex) for app shell + Director OS.
 */
function createClubBrandingStore() {
	let logoUrl = $state('');
	/** Canonical key from `clubs/{clubId}.sport` (e.g. soccer, basketball). */
	let sport = $state('soccer');
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
		sport = 'soccer';
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
					sport = 'soccer';
					applyToDocument();
					return;
				}
				const d = snap.data();
				const u = typeof d.brandLogoUrl === 'string' ? d.brandLogoUrl.trim() : '';
				logoUrl = u;
				const sp = typeof d.sport === 'string' && d.sport.trim() ? d.sport.trim().toLowerCase() : 'soccer';
				sport = sp;
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
		get sport() {
			return sport;
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
