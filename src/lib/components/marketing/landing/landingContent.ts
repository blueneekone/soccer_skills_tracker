/**
 * Landing Page — Pure Data Module
 * Marketing copy aligned with docs/vision/COMPETITIVE_LAUNCH_ASSESSMENT.md
 */
import type { IconName } from '$lib/icons/registry.js';

/** External win message — canonical positioning (also in competitive-launch rule). */
export const WIN_MESSAGE =
	'TeamSnap runs your season. SportsEngine runs your league. GotSport runs your state paperwork. SSTracker runs your athletes\' development — with the compliance architecture youth sports actually needs in 2026.';

export const HERO_HEADLINE = 'Run your club like a Mission Control for athlete development.';
export const HERO_SUBHEADLINE =
	'Schedules and chat got youth sports started. SSTracker closes the loop — train, progress, comply, and communicate safely across every persona.';

export const HERO_BADGE = 'SSTRACKER · CLUB OPERATING SYSTEM';

/** Trust campaign hero — strength-first positioning. Wired in LandingHero.svelte. */
export const HERO_TRUST_BADGE = 'SSTRACKER · CLUB OPERATING SYSTEM · 2026';
export const HERO_TRUST_HEADLINE = 'The first platform built for athlete development, not just season scheduling.';
export const HERO_TRUST_SUBHEADLINE =
	'SSTracker unifies coach intent, player progression, household consent, and club operations on one tenant-scoped platform — with SafeSport-native comms and COPPA compliance built in from the ground up, not bolted on.';

export const HERO_TRUST_MICRO_STRIP = [
	'Coach intent → Player train loop',
	'SafeSport-native · no coach→minor DMs',
	'COPPA / VPC · household consent built-in',
] as const;

export const HERO_TRUST_LEGAL =
	'SSTracker is an independent athlete development platform. Free to start — no upfront registration fees.';

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
		headline: 'B2B Revenue Panopticon.',
		body: 'Vampire Roster CSV importer, instant seat monetization, multi-sport tenant management, and a zero-trust vault.',
		features: [
			'Vampire Roster CSV importer',
			'Instant seat monetization',
			'Multi-sport tenant management',
			'Zero-trust vault',
		],
		accentLabel: 'DIRECTOR OS',
		gridLg: { col: '1 / 8', row: '1 / 2' },
	},
	{
		id: 'coaches',
		role: 'COACHES',
		roleClass: 'stakeholder-card--coaches',
		headline: 'Sideline SIEM.',
		body: 'Tactical whiteboard, real-time match attribution, lightning strike radar, 3-second mistake logging, and SafeSport Shadow CC.',
		features: [
			'Tactical whiteboard',
			'Real-time match attribution',
			'3-second mistake logging',
			'SafeSport Shadow CC',
		],
		accentLabel: 'COACH OS',
		gridLg: { col: '8 / 13', row: '1 / 2' },
	},
	{
		id: 'athletes',
		role: 'ATHLETES',
		roleClass: 'stakeholder-card--athletes',
		headline: 'The Dopamine Engine.',
		body: 'Scout\'s Six hexagon radar, Level/XP progression, daily streaks, 2% skill decay loss-avoidance, and Armory avatars.',
		features: [
			'Scout\'s Six hexagon radar',
			'Level/XP progression',
			'2% skill decay loss-avoidance',
			'Armory avatars',
		],
		accentLabel: 'PLAYER OS',
		gridLg: { col: '1 / 6', row: '2 / 3' },
	},
	{
		id: 'parents',
		role: 'PARENTS',
		roleClass: 'stakeholder-card--parents',
		headline: 'Compliance Shield.',
		body: 'Household roster graph, assistant coach delegation, 1-tap COPPA consent, and the 15-minute "Car Ride Home" emotional cooling-off protocol.',
		features: [
			'Household roster graph',
			'Assistant coach delegation',
			'1-tap COPPA consent',
			'15-minute "Car Ride Home" protocol',
		],
		accentLabel: 'PARENT OS',
		gridLg: { col: '6 / 13', row: '2 / 3' },
	},
	{
		id: 'recruiters',
		role: 'RECRUITERS',
		roleClass: 'stakeholder-card--recruiters',
		headline: 'Checkr Intelligence Gate.',
		body: 'Verified talent discovery, zero minor PII leakage, and National Criminal Database clearance.',
		features: [
			'Verified talent discovery',
			'Zero minor PII leakage',
			'National Criminal Database clearance',
			'Authenticated scouting pipelines',
		],
		accentLabel: 'RECRUITER OS',
		gridLg: { col: '1 / 8', row: '3 / 4' },
	},
	{
		id: 'commissioners',
		role: 'COMMISSIONERS',
		roleClass: 'stakeholder-card--commissioners',
		headline: 'League Panopticon.',
		body: 'Cross-tenant tournament staging, overarching compliance auditing, universal roster lock controls, and multi-club analytics.',
		features: [
			'Cross-tenant visibility',
			'League tournament staging',
			'Universal roster locks',
			'NGB compliance reporting',
		],
		accentLabel: 'COMMISSIONER OS',
		gridLg: { col: '8 / 13', row: '3 / 4' },
	},
	{
		id: 'fans',
		role: 'FANS & ALUMNI',
		roleClass: 'stakeholder-card--fans',
		headline: 'The Digital Bleachers.',
		body: 'Live match broadcasts, verified player stats viewing, alumni networking, and direct-to-club merchandise or donation pathways.',
		features: [
			'Live match broadcasts',
			'Verified stat viewing',
			'Alumni network access',
			'Direct-to-club support',
		],
		accentLabel: 'FAN OS',
		gridLg: { col: '1 / 6', row: '4 / 5' },
	},
	{
		id: 'admins',
		role: 'GLOBAL ADMINS',
		roleClass: 'stakeholder-card--admins',
		headline: 'Platform Panopticon.',
		body: 'Cross-tenant impersonation, global system alerts, root-level compliance auditing, and infrastructure anomaly detection.',
		features: [
			'Cross-tenant impersonation',
			'Global anomaly detection',
			'Root compliance auditing',
			'System-wide broadcast',
		],
		accentLabel: 'ADMIN OS',
		gridLg: { col: '6 / 13', row: '4 / 5' },
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
		gridLg: { col: '1 / 8', row: '1 / 2' },
		eyebrow: 'DEVELOPMENT OS (RL-READY)',
		headline: 'Coach intent → Player Train.',
		body: 'Deploy bounties with prescriptions. Athletes log sessions; XP and streaks update on HQ. Adaptive homework suggests the next drill when your policy allows.',
		href: '/features#development',
		accentColor: '#6366f1',
		icon: 'data.activity',
	},
	{
		id: 'octalysis',
		gridLg: { col: '8 / 13', row: '1 / 2' },
		eyebrow: 'OCTALYSIS ENGINE',
		headline: 'Systemic Churn-Reduction.',
		body: 'Gamified progression frameworks that keep athletes engaged week-over-week. Turn practice into a mission, driving gross retention.',
		href: '/features#octalysis',
		accentColor: '#10b981',
		icon: 'sport.soccer',
	},
	{
		id: 'compliance',
		gridLg: { col: '1 / 6', row: '2 / 3' },
		eyebrow: 'SAFESPORT COMMS',
		headline: 'Household-First Compliance.',
		body: 'Coach→minor DMs blocked. Parent CC on broadcasts. Household threads for families. Monitored channels — not a free-for-all team chat.',
		href: '/features#comms',
		accentColor: '#14b8a6',
		icon: 'status.shield-check',
	},
	{
		id: 'vampire-engine',
		gridLg: { col: '6 / 13', row: '2 / 3' },
		eyebrow: 'THE VAMPIRE ENGINE',
		headline: 'Frictionless 5-second imports.',
		body: 'Migrate off legacy platforms seamlessly. Headless ingestion vacuums existing rosters, schedules, and compliance docs without manual data entry.',
		href: '/features#ingestion',
		accentColor: '#06b6d4',
		icon: 'action.download',
	},
	{
		id: 'car-ride',
		gridLg: { col: '1 / 7', row: '3 / 4' },
		eyebrow: 'CAR RIDE HOME PROTOCOL',
		headline: 'Co-op partner, not spectator.',
		body: 'Transform the dreaded "car ride home" into an alignment session. Parents receive coach intent briefings and post-match debrief structures instantly.',
		href: '/features#parents',
		accentColor: '#f59e0b',
		icon: 'comm.chat',
	},
	{
		id: 'director-ops',
		gridLg: { col: '7 / 13', row: '3 / 4' },
		eyebrow: 'DIRECTOR OS',
		headline: 'Field ops · compliance.',
		body: 'Deployment calendar, eligibility matrix, coach clearance, registration programs, and club broadcasts — tenant-scoped director surfaces.',
		href: '/features#director-ops',
		accentColor: '#fbbf24',
		icon: 'status.shield-check',
	},
];
