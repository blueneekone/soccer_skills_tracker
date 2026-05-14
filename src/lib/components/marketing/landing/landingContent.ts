/**
 * Landing Page — Pure Data Module
 * All marketing copy, card definitions, and metric constants.
 * No Svelte runes. No side effects. Import-only.
 */

// ── Hero copy (sub-10-word locked headline + A/B alternates) ─────────────
export const HERO_HEADLINE = 'Run your club like a Mission Control.';
export const HERO_SUBHEADLINE =
	'Zero-liability PII, RL adaptive training, and an Octalysis RPG loop — built for elite youth clubs.';
export const HERO_HEADLINE_VARIANTS = [
	'Mission Control for elite youth clubs.',
	'The Player OS your club already runs.',
] as const;

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

// ── Client Logo Bar ───────────────────────────────────────────────────────
export interface LogoMark {
	id: string;
	name: string;
	src: string;
	width: number;
	height: number;
}

export const ANCHOR_CLUBS: LogoMark[] = [
	{ id: 'club-1', name: 'Nexus FC', src: '/marketing/clients/nexus-fc.svg', width: 120, height: 40 },
	{ id: 'club-2', name: 'Apex United', src: '/marketing/clients/apex-united.svg', width: 120, height: 40 },
	{ id: 'club-3', name: 'Vanguard SC', src: '/marketing/clients/vanguard-sc.svg', width: 120, height: 40 },
	{ id: 'club-4', name: 'Meridian Athletic', src: '/marketing/clients/meridian-athletic.svg', width: 120, height: 40 },
	{ id: 'club-5', name: 'Zenith Academy', src: '/marketing/clients/zenith-academy.svg', width: 120, height: 40 },
	{ id: 'club-6', name: 'Forge Elite', src: '/marketing/clients/forge-elite.svg', width: 120, height: 40 },
];

export const INTEGRATIONS: LogoMark[] = [
	{ id: 'int-firebase', name: 'Firebase', src: '/marketing/integrations/firebase.svg', width: 100, height: 28 },
	{ id: 'int-stripe', name: 'Stripe', src: '/marketing/integrations/stripe.svg', width: 80, height: 28 },
	{ id: 'int-tremendous', name: 'Tremendous', src: '/marketing/integrations/tremendous.svg', width: 120, height: 28 },
	{ id: 'int-checkr', name: 'Checkr', src: '/marketing/integrations/checkr.svg', width: 90, height: 28 },
	{ id: 'int-googlemaps', name: 'Google Maps', src: '/marketing/integrations/google-maps.svg', width: 110, height: 28 },
];

// ── Feature Bento Grid 2.0 ────────────────────────────────────────────────
export interface FeatureCell {
	id: string;
	span: 'single' | 'double';
	eyebrow: string;
	headline: string;
	body: string;
	href: string;
	accentColor: string;
	/** inline SVG string for the cell's glyph/illustration */
	glyphId: string;
}

export const FEATURE_BENTO: FeatureCell[] = [
	{
		id: 'rl-workouts',
		span: 'double',
		eyebrow: 'ADAPTIVE AI ENGINE',
		headline: 'RL Workouts That Learn You.',
		body: 'A Reinforcement Learning policy adjusts drill volume, intensity, and sequence in real time based on physiological feedback and historical adherence — not a static template.',
		href: '/features#rl-workouts',
		accentColor: '#6366f1',
		glyphId: 'glyph-waveform',
	},
	{
		id: 'skill-tree',
		span: 'single',
		eyebrow: 'OCTALYSIS RPG',
		headline: 'Composite Snowflake Skill Tree.',
		body: 'Synthetic Authored Nodes map 50+ skill axes to 5,000+ raw drills. Fog of War masks advanced nodes until earned.',
		href: '/features#skill-tree',
		accentColor: '#8b5cf6',
		glyphId: 'glyph-hexradar',
	},
	{
		id: 'coppa',
		span: 'single',
		eyebrow: 'COMPLIANCE',
		headline: 'WebAuthn COPPA 2.0.',
		body: 'Biometric enclave attestation binds parental consent to hardware. Four-layer teen ad-block. Zero SMS exposure.',
		href: '/features#coppa',
		accentColor: '#10b981',
		glyphId: 'glyph-fingerprint',
	},
	{
		id: 'cell-routing',
		span: 'single',
		eyebrow: 'INFRASTRUCTURE',
		headline: 'Cell-Based Tenant Routing.',
		body: 'Large NGBs land in isolated Firestore cells. No noisy-neighbor throttling. Backend-issued JWT selects the cell.',
		href: '/features#architecture',
		accentColor: '#06b6d4',
		glyphId: 'glyph-routing',
	},
	{
		id: 'bounties',
		span: 'single',
		eyebrow: 'EMBEDDED FINANCE',
		headline: 'Tremendous Bounty Escrow.',
		body: 'Parents fund real-world rewards. CV-verified biomechanics triggers atomic Firestore payout. No manual verification.',
		href: '/features#bounties',
		accentColor: '#f59e0b',
		glyphId: 'glyph-escrow',
	},
	{
		id: 'pricing',
		span: 'double',
		eyebrow: 'ENTERPRISE PRICING',
		headline: '$0 Platform Fee. Always.',
		body: 'No seat licenses. No monthly minimums. A fractional micro-percentage on transaction volume only. Revenue that scales with your club.',
		href: '/pricing',
		accentColor: '#6366f1',
		glyphId: 'glyph-zero',
	},
];
