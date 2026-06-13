/**
 * Acquisition page — pure data for strategic buyer / M&A surface.
 * Aligns with docs/vision/COMPETITIVE_LAUNCH_ASSESSMENT.md and landingContent.
 */
import { MOAT_PILLARS, WIN_MESSAGE } from '../landing/landingContent.js';

export { WIN_MESSAGE, MOAT_PILLARS };

export const ACQ_HEADLINE = 'Strategic acquisition — development OS for youth clubs.';
export const ACQ_SUBHEAD =
	'SSTracker is the athlete development and compliance platform clubs adopt when schedule-and-chat tools stop scaling. Built on Firebase, Svelte 5, and household-first SafeSport architecture.';

export const ACQ_BADGE = 'SSTRACKER · ACQUISITION BRIEF';

export interface AcquisitionHighlight {
	id: string;
	title: string;
	body: string;
}

/** Shipped assets an acquirer inherits — not a feature checklist. */
export const ACQ_HIGHLIGHTS: AcquisitionHighlight[] = [
	{
		id: 'dev-loop',
		title: 'Player development loop',
		body: 'Train → XP → coach intent/bounties → RL homework. Player HQ, skill progression, and prescription-locked sessions — not a static drill PDF.',
	},
	{
		id: 'compliance',
		title: 'Compliance architecture',
		body: 'Household graph, VPC consent records, SafeSport-native comms, coach clearance, and minor retention — enforced in Firestore rules, not policy PDFs.',
	},
	{
		id: 'tryouts',
		title: 'Tryout lifecycle OS',
		body: 'Registration through eval plans, callbacks, and roster placement with automated guardian comms — table stakes competitors treat as add-ons.',
	},
	{
		id: 'ops',
		title: 'Club operations stack',
		body: 'Director field ops, RSVP, registration-lite, roster invite, parent lounge, and payments on one tenant-scoped Firebase project.',
	},
];

export interface AcquisitionLimitation {
	label: string;
	status: string;
	note: string;
}

/** Honest gaps — see docs/acquisition/NOTABLE_GAPS.md */
export const ACQ_LIMITATIONS: AcquisitionLimitation[] = [
	{
		label: 'Club website builder',
		status: 'Not building',
		note: 'Public /register, /tryouts, and /club/{slug} routes replace drag-and-drop CMS.',
	},
	{
		label: 'Native app store binaries',
		status: 'Capacitor MVP',
		note: 'PWA + web shipped; store submission is acquirer-operated post-close.',
	},
	{
		label: 'Federation API (38 bodies)',
		status: 'CSV v1',
		note: 'State roster export v1 + federation roadmap — not GotSport-grade API yet.',
	},
	{
		label: 'Live streaming CDN',
		status: 'Embed MVP',
		note: 'YouTube/Vimeo/Mux URL on events — not TeamSnap-class native CDN.',
	},
];

export const ACQ_CONTACT_EMAIL = 'acquisition@sstracker.com';
