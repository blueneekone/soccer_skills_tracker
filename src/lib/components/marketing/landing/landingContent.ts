/**
 * Landing Page — Pure Data Module
 * All marketing copy, card definitions, and metric constants.
 * No Svelte runes. No side effects. Import-only.
 */

export interface StakeholderCard {
	id: string;
	role: string;
	roleClass: string;
	headline: string;
	body: string;
	features: string[];
	accentLabel: string;
}

export interface RevenueEngine {
	id: string;
	label: string;
	value: string;
	descriptor: string;
	href: string;
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
		headline: 'Headless Ingestion. Zero-Liability Compliance.',
		body: 'Upload any CSV, JSON, or PDF league roster and our headless ingestion pipeline automatically provisions player profiles and distributes invite codes. Embed Checkr background checks directly in the onboarding flow — staff clearance is tracked, time-locked, and burnt after 24 hours.',
		features: [
			'Headless CSV / JSON / PDF ingestion',
			'Embedded Checkr staff onboarding',
			'Zero-liability PII burn protocol',
			'Multi-team tenant isolation',
		],
		accentLabel: 'CLUB COMMAND',
	},
	{
		id: 'coaches',
		role: 'COACHES',
		roleClass: 'stakeholder-card--coaches',
		headline: 'RL Adaptive Workouts. Intent-Based Triggers.',
		body: 'Assign a single macro-goal and our Reinforcement Learning engine autonomously generates individualized daily drills per player — adjusting volume and difficulty based on continuous physiological feedback and historical adherence. Stop writing training plans. Start commanding outcomes.',
		features: [
			'RL-adaptive workout generation',
			'Intent-based homework triggers',
			'Real-time adherence telemetry',
			'Tactical War Room SVG canvas',
		],
		accentLabel: 'COACH COMMAND',
	},
	{
		id: 'athletes',
		role: 'ATHLETES',
		roleClass: 'stakeholder-card--athletes',
		headline: 'The Octalysis RPG Loop. Real Rewards.',
		body: 'Level up through the Composite Snowflake skill tree, earn XP on every verified rep, maintain daily streaks to prevent skill decay, and unlock Tremendous API gift-card bounties verified by computer vision. Every session is a boss fight. Every milestone is a real-world reward.',
		features: [
			'Composite Snowflake skill tree',
			'Octalysis 8-core drive loop',
			'Daily streaks + Grit XP system',
			'CV-verified Tremendous bounties',
		],
		accentLabel: 'PLAYER OS',
	},
	{
		id: 'parents',
		role: 'PARENTS',
		roleClass: 'stakeholder-card--parents',
		headline: 'COPPA 2.0 Hardened. Emotionally Intelligent.',
		body: 'Consent is bound to on-device hardware biometrics via WebAuthn attestation. Access is granted through passwordless Email Magic Uplinks — no SMS, no SIM-swap risk. Post-match, "The Car Ride Home Protocol" fires push notifications with empathetic conversation anchors before your child gets in the car.',
		features: [
			'WebAuthn biometric COPPA 2.0 consent',
			'Passwordless Email Magic Uplinks',
			'Car Ride Home Protocol (EQ perimeter)',
			'Household co-op bounty dashboard',
		],
		accentLabel: 'FAMILY SHIELD',
	},
];

export const REVENUE_ENGINES: RevenueEngine[] = [
	{
		id: 'base',
		label: '$0',
		value: 'BASE PLATFORM FEE',
		descriptor: 'No seat licenses. No monthly minimums. No off-season friction. Clubs pay nothing until athletes transact.',
		href: '/pricing',
	},
	{
		id: 'transaction',
		label: '< 1%',
		value: 'TRANSACTION MICRO-FEE',
		descriptor: 'A fractional percentage on registration volume only. The more your club grows, the more our incentives align with yours.',
		href: '/pricing',
	},
	{
		id: 'ancillary',
		label: '+',
		value: 'ANCILLARY REVENUE ENGINES',
		descriptor: 'Digital ticketing sales and hotel block rebates turn your management software into a profit center for your NGB.',
		href: '/pricing',
	},
];

export const TRUST_BADGES: TrustBadge[] = [
	{ label: 'COPPA 2.0', sublabel: 'COMPLIANT' },
	{ label: 'WebAuthn', sublabel: 'BIOMETRIC CONSENT' },
	{ label: 'Checkr', sublabel: 'ZERO-LIABILITY BGC' },
	{ label: 'Tremendous', sublabel: 'CV-VERIFIED REWARDS' },
	{ label: 'PII BURN', sublabel: '24H PROTOCOL' },
	{ label: 'TENANT ISO', sublabel: 'ZERO-TRUST CORE' },
];

export const PLATFORM_METRICS = [
	{ value: 4200, label: 'ATHLETES DEPLOYED', suffix: '+' },
	{ value: 312, label: 'CLUBS ACTIVE', suffix: '' },
	{ value: 18, label: 'COUNTRIES', suffix: '' },
	{ value: 99.98, label: 'UPTIME SLA', suffix: '%' },
] as const;

export const FINAL_CTA_FEATURES = [
	'Universal roster ingestion',
	'RL-adaptive training engine',
	'Octalysis RPG progression',
	'COPPA 2.0 & SafeSport compliant',
	'WebAuthn biometric consent',
	'Tremendous bounty integration',
] as const;
