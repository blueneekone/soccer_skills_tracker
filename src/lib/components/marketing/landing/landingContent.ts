/**
 * Landing Page — Pure Data Module
 * Marketing copy aligned with docs/vision/COMPETITIVE_LAUNCH_ASSESSMENT.md
 */
import type { IconName } from '$lib/icons/registry.js';

/** External win message — canonical positioning (also in competitive-launch rule). */
export const WIN_MESSAGE =
	'TeamSnap runs your season. SportsEngine runs your league. GotSport runs your state paperwork. SSTracker runs your athletes\' development — with the compliance architecture youth sports actually needs in 2026.';

export const HERO_HEADLINE = 'Run your club like a Mission Control.';
export const HERO_SUBHEADLINE =
	'Schedules and chat got youth sports started. SSTracker closes the loop — train, progress, comply, and communicate safely across every persona.';

export const HERO_BADGE = 'SSTRACKER · CLUB OPERATING SYSTEM';

/** Trust campaign hero — Option A (director-facing, Utah 2026). Wired in LandingHero.svelte. */
export const HERO_TRUST_BADGE = 'SSTRACKER · TRUST & REGISTRATION · 2026';
export const HERO_TRUST_HEADLINE = "When statewide registration pauses, development shouldn't.";
export const HERO_TRUST_SUBHEADLINE =
	'In June 2026, Utah families reported unauthorized card activity after youth soccer registration—and sign-ups stopped while the platform investigated. SSTracker separates season payments (Stripe Connect), minor consent (household VPC), and athlete development on tenant-scoped infrastructure. One registration outage shouldn\'t freeze your entire club OS.';

export const HERO_TRUST_MICRO_STRIP = [
	'Stripe Connect · cards at processor',
	'VPC + consent audit trail',
	'SafeSport · no coach→minor DMs',
] as const;

export const HERO_TRUST_LEGAL =
	'SSTracker does not comment on Stack Sports\' investigation. Utah reports described potential unauthorized charges; a formal breach was not publicly confirmed at time of writing.';

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
		id: 'solo-tutor',
		readoutKey: 'TIER_1',
		label: '$19/mo',
		value: 'SOLO TUTOR',
		descriptor: 'Perfect for private coaches and trainers. Includes Intent Engine, Player HQ, and basic drill library.',
		href: '/pricing',
		status: 'ACTIVE',
	},
	{
		id: 'single-team',
		readoutKey: 'TIER_2',
		label: '$49/mo',
		value: 'SINGLE TEAM',
		descriptor: 'For independent teams. Includes Guardian-linked rosters, SafeSport-native comms, and team logistics.',
		href: '/pricing',
		status: 'ACTIVE',
	},
	{
		id: 'pro-club',
		readoutKey: 'TIER_3',
		label: '$199/mo',
		value: 'PRO CLUB (DIRECTOR OS)',
		descriptor: 'The complete club operating system. Includes Director field ops, VPC audit, coach clearance matrix, and multi-team isolation.',
		href: '/pricing',
		status: 'ACTIVE',
	},
	{
		id: 'recruiter',
		readoutKey: 'TIER_4',
		label: 'Custom',
		value: 'RECRUITER/SCOUT PORTAL',
		descriptor: 'Bespoke access for college recruiters and pro scouts. Pipeline management and advanced telemetry.',
		href: '/pricing',
		status: 'CONTACT US',
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
		gridLg: { col: '1 / 9', row: '1 / 2' },
		eyebrow: 'DEVELOPMENT OS (RL-READY)',
		headline: 'Coach intent → Player Train.',
		body: 'Deploy bounties with prescriptions. Athletes log sessions; XP and streaks update on HQ. Adaptive homework suggests the next drill when your policy allows.',
		href: '/features#development',
		accentColor: '#6366f1',
		icon: 'data.activity',
	},
	{
		id: 'octalysis',
		gridLg: { col: '9 / 13', row: '1 / 2' },
		eyebrow: 'OCTALYSIS ENGINE',
		headline: 'Systemic Churn-Reduction.',
		body: 'Gamified progression frameworks that keep athletes engaged week-over-week. Turn practice into a mission, driving gross retention.',
		href: '/features#octalysis',
		accentColor: '#10b981',
		icon: 'sport.soccer',
	},
	{
		id: 'compliance',
		gridLg: { col: '1 / 5', row: '2 / 3' },
		eyebrow: 'SAFESPORT COMMS',
		headline: 'Household-First Compliance.',
		body: 'Coach→minor DMs blocked. Parent CC on broadcasts. Household threads for families. Monitored channels — not a free-for-all team chat.',
		href: '/features#comms',
		accentColor: '#14b8a6',
		icon: 'status.shield-check',
	},
	{
		id: 'vampire-engine',
		gridLg: { col: '5 / 13', row: '2 / 3' },
		eyebrow: 'THE VAMPIRE ENGINE',
		headline: 'Frictionless 5-second imports.',
		body: 'Migrate off legacy platforms seamlessly. Headless ingestion vacuums existing rosters, schedules, and compliance docs without manual data entry.',
		href: '/features#ingestion',
		accentColor: '#06b6d4',
		icon: 'sys.cloud-arrow-down',
	},
	{
		id: 'car-ride',
		gridLg: { col: '1 / 9', row: '3 / 4' },
		eyebrow: 'CAR RIDE HOME PROTOCOL',
		headline: 'Co-op partner, not spectator.',
		body: 'Transform the dreaded "car ride home" into an alignment session. Parents receive coach intent briefings and post-match debrief structures instantly.',
		href: '/features#parents',
		accentColor: '#f59e0b',
		icon: 'comm.chat-bubble-left',
	},
	{
		id: 'director-ops',
		gridLg: { col: '9 / 13', row: '3 / 4' },
		eyebrow: 'DIRECTOR OS',
		headline: 'Field ops · compliance.',
		body: 'Deployment calendar, eligibility matrix, coach clearance, registration programs, and club broadcasts — tenant-scoped director surfaces.',
		href: '/features#director-ops',
		accentColor: '#fbbf24',
		icon: 'status.shield-check',
	},
];
