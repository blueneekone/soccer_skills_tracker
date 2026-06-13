/**
 * Landing Page — Pure Data Module
 * Marketing copy aligned with docs/vision/COMPETITIVE_LAUNCH_ASSESSMENT.md
 */
import type { IconName } from '$lib/icons/registry.js';

/** External win message — canonical positioning (also in competitive-launch rule). */
export const WIN_MESSAGE =
	'TeamSnap runs your season. SportsEngine runs your league. GotSport runs your state paperwork. SSTracker runs your athletes\' development — with the compliance architecture youth sports actually needs in 2026.';

export const HERO_HEADLINE = 'The club platform built for athlete development.';
export const HERO_SUBHEADLINE =
	'Schedules and chat got youth sports started. SSTracker closes the loop — train, progress, comply, and communicate safely across every persona.';

export const HERO_BADGE = 'SSTRACKER · CLUB OPERATING SYSTEM';

export interface CompareRow {
	id: string;
	platform: string;
	tagline: string;
}

/** Category framing — not a feature checklist; sets buyer context. */
export const COMPARE_ROWS: CompareRow[] = [
	{ id: 'teamsnap', platform: 'TeamSnap', tagline: 'Runs your season — schedules, RSVPs, parent app.' },
	{ id: 'sportsengine', platform: 'SportsEngine', tagline: 'Runs your league — registration, eligibility, NGB tools.' },
	{ id: 'gotsport', platform: 'GotSport', tagline: 'Runs your state paperwork — roster rules and governing bodies.' },
	{ id: 'sstracker', platform: 'SSTracker', tagline: 'Runs your athletes\' development — with household-first compliance.' },
];

export interface MoatPillar {
	id: string;
	title: string;
	body: string;
}

export const MOAT_PILLARS: MoatPillar[] = [
	{
		id: 'develop',
		title: 'Development OS',
		body: 'Coach intents, locked prescriptions, XP and skill progression, adaptive homework — not a static drill PDF.',
	},
	{
		id: 'comply',
		title: 'Compliance architecture',
		body: 'Households, VPC consent, SafeSport-native comms, coach clearance, and minor retention — built in, not bolted on.',
	},
	{
		id: 'operate',
		title: 'Club operations',
		body: 'Director field ops, team logistics, guardian-linked rosters, parent lounge, and payments on one tenant.',
	},
];

export interface StakeholderCard {
	id: string;
	role: string;
	roleClass: string;
	headline: string;
	body: string;
	features: string[];
	accentLabel: string;
	gridLg: { col: string; row: string };
}

export interface RevenueEngine {
	id: string;
	readoutKey: string;
	label: string;
	value: string;
	descriptor: string;
	href: string;
	status: string;
}

export interface TrustBadge {
	label: string;
	sublabel: string;
}

export const STAKEHOLDERS: StakeholderCard[] = [
	{
		id: 'directors',
		role: 'DIRECTORS',
		roleClass: 'stakeholder-card--directors',
		headline: 'One club command surface.',
		body: 'Field ops calendar, deployment windows, household linking, compliance audit, and club broadcasts — scoped to your tenant with registrar and director roles.',
		features: [
			'Deployment calendar + family announce',
			'Household linker + VPC audit',
			'Coach clearance matrix',
			'Multi-team tenant isolation',
		],
		accentLabel: 'DIRECTOR OS',
		gridLg: { col: '1 / 8', row: '1 / 2' },
	},
	{
		id: 'coaches',
		role: 'COACHES',
		roleClass: 'stakeholder-card--coaches',
		headline: 'Intent, not inbox chaos.',
		body: 'Assign bounties with prescriptions, design team drills spatially, see guardian and VPC status on the roster, and run logistics — schedule, RSVP headcounts, attendance — without gamification chrome.',
		features: [
			'Intent Engine + drill library',
			'Guardian-linked roster grid',
			'Team logistics hub',
			'Match-day + scouting pipeline',
		],
		accentLabel: 'COACH OS',
		gridLg: { col: '8 / 13', row: '1 / 2' },
	},
	{
		id: 'athletes',
		role: 'ATHLETES',
		roleClass: 'stakeholder-card--athletes',
		headline: 'Train like it counts.',
		body: 'Player HQ surfaces missions, telemetry, and adaptive homework. Coach-locked sessions keep prescriptions honest. Progress is visible — not buried in a team chat thread.',
		features: [
			'Train + XP + streak loop',
			'Coach bounty handoff',
			'Adaptive homework (RL-ready)',
			'Armory + stats investigation',
		],
		accentLabel: 'PLAYER OS',
		gridLg: { col: '1 / 4', row: '2 / 3' },
	},
	{
		id: 'parents',
		role: 'PARENTS',
		roleClass: 'stakeholder-card--parents',
		headline: 'Co-op partner, not spectator.',
		body: 'Household hub, VPC ceremony, event RSVP, co-op logging, proof review, and Parent Lounge — SafeSport-monitored comms with your club.',
		features: [
			'Household + VPC golden path',
			'Event availability (RSVP)',
			'Co-op + car ride debrief',
			'Parent Lounge per team',
		],
		accentLabel: 'PARENT OS',
		gridLg: { col: '4 / 13', row: '2 / 3' },
	},
];

export const REVENUE_ENGINES: RevenueEngine[] = [
	{
		id: 'base',
		readoutKey: 'BASE_PLATFORM',
		label: '$0',
		value: 'BASE PLATFORM FEE',
		descriptor: 'No seat licenses. No monthly minimums. Clubs pay on transaction volume — aligned incentives as you grow.',
		href: '/pricing',
		status: 'OK',
	},
	{
		id: 'transaction',
		readoutKey: 'TX_MICRO',
		label: '< 1%',
		value: 'TRANSACTION MICRO-FEE',
		descriptor: 'Fractional fee on registration and club payments only — not a tax on every feature click.',
		href: '/pricing',
		status: 'OK',
	},
	{
		id: 'ancillary',
		readoutKey: 'ANCILLARY',
		label: '+',
		value: 'EVENT & REBATE ENGINES',
		descriptor: 'Optional tournament ticketing and travel rebate workflows when your club is ready — not required on day one.',
		href: '/pricing',
		status: 'OPT-IN',
	},
];

export const TRUST_BADGES: TrustBadge[] = [
	{ label: 'COPPA / VPC', sublabel: 'HOUSEHOLD CONSENT' },
	{ label: 'SafeSport', sublabel: 'COMMS POLICY' },
	{ label: 'WebAuthn', sublabel: 'PASSKEY READY' },
	{ label: 'Checkr-ready', sublabel: 'STAFF CLEARANCE' },
	{ label: 'PII burn', sublabel: 'RETENTION PROTOCOL' },
	{ label: 'Tenant ISO', sublabel: 'CLUB SCOPED DATA' },
];

export const FINAL_CTA_FEATURES = [
	'Player development loop',
	'Household-first compliance',
	'Coach intent + logistics',
	'Director field operations',
	'SafeSport-native comms',
	'Guardian-linked rosters',
] as const;

export interface LogoMark {
	id: string;
	name: string;
	src: string;
	width: number;
	height: number;
}

export const INTEGRATIONS: LogoMark[] = [
	{ id: 'int-firebase', name: 'Firebase', src: '/marketing/integrations/firebase.svg', width: 100, height: 28 },
	{ id: 'int-stripe', name: 'Stripe', src: '/marketing/integrations/stripe.svg', width: 80, height: 28 },
	{ id: 'int-tremendous', name: 'Tremendous', src: '/marketing/integrations/tremendous.svg', width: 120, height: 28 },
	{ id: 'int-checkr', name: 'Checkr', src: '/marketing/integrations/checkr.svg', width: 90, height: 28 },
	{ id: 'int-googlemaps', name: 'Google Maps', src: '/marketing/integrations/google-maps.svg', width: 110, height: 28 },
];

export interface FeatureCell {
	id: string;
	eyebrow: string;
	headline: string;
	body: string;
	href: string;
	accentColor: string;
	icon: IconName;
	gridLg: { col: string; row: string };
}

export const FEATURE_BENTO: FeatureCell[] = [
	{
		id: 'develop',
		gridLg: { col: '1 / 8', row: '1 / 3' },
		eyebrow: 'DEVELOPMENT OS',
		headline: 'Coach intent → Player Train.',
		body: 'Deploy bounties with prescriptions. Athletes log sessions; XP and streaks update on HQ. Adaptive homework suggests the next drill when your policy allows.',
		href: '/features#development',
		accentColor: '#6366f1',
		icon: 'data.activity',
	},
	{
		id: 'household',
		gridLg: { col: '8 / 13', row: '1 / 2' },
		eyebrow: 'HOUSEHOLD GRAPH',
		headline: 'Guardian ↔ athlete, everywhere.',
		body: 'Linked on admin roster, coach grid, and global users. Directors repair broken links. Comms and VPC resolve through one household — not scattered profiles.',
		href: '/features#household',
		accentColor: '#10b981',
		icon: 'user.group',
	},
	{
		id: 'comms',
		gridLg: { col: '8 / 13', row: '2 / 3' },
		eyebrow: 'SAFESPORT COMMS',
		headline: 'Parent Lounge + policy.',
		body: 'Coach→minor DMs blocked. Parent CC on broadcasts. Household threads for families. Monitored channels — not a free-for-all team chat.',
		href: '/features#comms',
		accentColor: '#14b8a6',
		icon: 'status.shield-check',
	},
	{
		id: 'logistics',
		gridLg: { col: '1 / 5', row: '3 / 4' },
		eyebrow: 'TEAM OPS',
		headline: 'Schedule · RSVP · Attendance.',
		body: 'Practice and game events with reminders. Parents confirm availability. Coaches see headcounts before arrival — not just post-hoc roll call.',
		href: '/features#logistics',
		accentColor: '#06b6d4',
		icon: 'sys.calendar',
	},
	{
		id: 'drills',
		gridLg: { col: '5 / 9', row: '3 / 4' },
		eyebrow: 'DRILL LIBRARY',
		headline: 'Team · club · platform.',
		body: 'Spatial designer saves to your team. Share with the club when ready. Intent Engine picks from scoped catalogs — not a global junk drawer.',
		href: '/features#drills',
		accentColor: '#f59e0b',
		icon: 'sys.map-pin',
	},
	{
		id: 'pricing',
		gridLg: { col: '9 / 13', row: '3 / 4' },
		eyebrow: 'PRICING',
		headline: '$0 platform fee.',
		body: 'Grow without seat-tax friction. Transaction-aligned pricing when families register and pay through your club.',
		href: '/pricing',
		accentColor: '#6366f1',
		icon: 'sys.dollar',
	},
];
