import { error } from '@sveltejs/kit';
import { getAdminDb } from '$lib/server/admin';

export async function load({ params }) {
	const slug = (params.slug || '').trim().toLowerCase();
	if (!slug) {
		error(404, 'Club not found');
	}

	const db = getAdminDb();
	const snap = await db.collection('clubs')
		.where('marketing.publicSlug', '==', slug)
		.limit(1)
		.get();

	if (snap.empty) {
		error(404, 'Club not found');
	}

	const clubDoc = snap.docs[0];
	const clubId = clubDoc.id;
	const c = clubDoc.data() || {};

	// Also fetch the tracking configs for secure pixel injection
	const configSnap = await db.collection('marketing_configs').doc(clubId).get();
	const configData = configSnap.exists ? configSnap.data() || {} : {};

	const metaPixelId = typeof configData.metaPixelId === 'string' ? configData.metaPixelId.trim().slice(0, 64) : '';
	const googleAnalyticsId = typeof configData.googleAnalyticsId === 'string' ? configData.googleAnalyticsId.trim().slice(0, 64) : '';

	const athletes: Record<string, unknown>[] = [];
	try {
		const profSnap = await db.collection('public_player_profiles')
			.where('clubId', '==', clubId)
			.orderBy('current_level', 'desc')
			.limit(8)
			.get();
		
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
