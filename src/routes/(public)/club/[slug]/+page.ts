import { error } from '@sveltejs/kit';
import { db } from '$lib/firebase.js';
import { collection, query, where, limit, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';

export async function load({ params }) {
	const slug = (params.slug || '').trim().toLowerCase();
	if (!slug) {
		error(404, 'Club not found');
	}

	const clubsRef = collection(db, 'clubs');
	const q = query(clubsRef, where('marketing.publicSlug', '==', slug), limit(1));
	const snap = await getDocs(q);

	if (snap.empty) {
		error(404, 'Club not found');
	}

	const clubDoc = snap.docs[0];
	const clubId = clubDoc.id;
	const c = clubDoc.data() || {};

	// Also fetch the tracking configs for secure pixel injection
	const configSnap = await getDoc(doc(db, 'marketing_configs', clubId));
	const configData = configSnap.exists() ? configSnap.data() || {} : {};

	const metaPixelId = typeof configData.metaPixelId === 'string' ? configData.metaPixelId.trim().slice(0, 64) : '';
	const googleAnalyticsId = typeof configData.googleAnalyticsId === 'string' ? configData.googleAnalyticsId.trim().slice(0, 64) : '';

	const athletes = [];
	try {
		const profRef = collection(db, 'public_player_profiles');
		const profQ = query(profRef, where('clubId', '==', clubId), orderBy('current_level', 'desc'), limit(8));
		const profSnap = await getDocs(profQ);
		
		profSnap.forEach((d) => {
			const p = d.data() || {};
			athletes.push({
				id: d.id,
				displayName: p.displayName || null,
				ageGroup: p.ageGroup || null,
				position: p.position || null,
				current_level: p.current_level || 1,
				total_xp: p.total_xp || 0,
				verified_trial_scores: p.verified_trial_scores || {},
				brandLogoUrl: p.brandLogoUrl || null,
				clubDisplayName: p.clubDisplayName || null,
			});
		});
	} catch (e) {
		console.warn('getPublicClubLanding athletes query', e);
	}

	const sportRaw = typeof c.sport === 'string' ? c.sport.trim().toLowerCase() : '';
	const sport = sportRaw && [
		'soccer', 'basketball', 'baseball', 'football', 'volleyball', 'hockey', 'lacrosse', 'generic'
	].includes(sportRaw) ? sportRaw : 'generic';

	return {
		ok: true,
		clubId,
		slug,
		clubName: typeof c.name === 'string' ? c.name : '',
		sport,
		brandLogoUrl: typeof c.brandLogoUrl === 'string' ? c.brandLogoUrl : '',
		brandPrimaryHex: typeof c.brandPrimaryHex === 'string' ? c.brandPrimaryHex : '',
		brandAccentHex: typeof c.brandAccentHex === 'string' ? c.brandAccentHex : '',
		metaPixelId,
		googleAnalyticsId,
		athletes
	};
}
