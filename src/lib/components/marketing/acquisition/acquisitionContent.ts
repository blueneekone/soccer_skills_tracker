/**
 * Acquisition page — pure data for strategic buyer / M&A surface.
 * Aligns with docs/acquisition/* and docs/vision/COMPETITIVE_LAUNCH_ASSESSMENT.md
 */
import { MOAT_PILLARS, WIN_MESSAGE } from '../landing/landingContent.js';

export { WIN_MESSAGE, MOAT_PILLARS };

export const ACQ_HEADLINE = 'Strategic acquisition — development OS for youth clubs.';
export const ACQ_SUBHEAD =
	'SSTracker is the athlete development and compliance platform clubs adopt when schedule-and-chat tools stop scaling. Built on Firebase, Svelte 5, and household-first SafeSport architecture.';

export const ACQ_BADGE = 'SSTRACKER · ACQUISITION BRIEF';

export const ACQ_PDF_EXECUTIVE_BRIEF = '/acquisition/sstracker-executive-brief.pdf';
export const ACQ_PDF_PROSPECTUS = '/acquisition/sstracker-prospectus.pdf';

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

/** Honest gaps — see docs/acquisition/NOTABLE_GAPS.md (Wave 4 current) */
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
		status: 'CSV v1 + Phase 3 sync',
		note: 'State roster export and Phase 3 federation sync shipped; GotSport-grade live API remains Partial.',
	},
	{
		label: 'Live streaming CDN',
		status: 'Embed MVP',
		note: 'YouTube/Vimeo/Mux URL on events and match sessions — not TeamSnap-class native CDN or broadcast schedule tooling.',
	},
	{
		label: 'Registration → roster UX',
		status: 'Shipped',
		note: 'Drag-drop assign panel (`RegistrationRosterAssignPanel`) closed Wave 4 — not a gap.',
	},
	{
		label: 'Tournament brackets',
		status: 'Shipped',
		note: 'Single- and double-elimination on `TournamentBracketPanel` — Wave 4 Done.',
	},
];

export interface TractionSignal {
	label: string;
	value: string;
}

/** Factual build signals — no MAU/ARR invention (docs/acquisition/TRACTION.md) */
export const ACQ_TRACTION_STRIP: TractionSignal[] = [
	{ label: 'Commercial stage', value: 'Pre-commercial · $0 ARR documented' },
	{ label: 'LAUNCH Wave 0–2', value: 'Done — household, RSVP, reg, tryouts, parent parity' },
	{ label: 'Wave 3A + 3B', value: 'Done — gap closure + live deploy smoke green' },
	{ label: 'Wave 4 competitive parity', value: 'Done — orch-wave4 merge 2026-06-15' },
	{ label: 'Owner FUNCTIONAL_MVP QA', value: 'Pending — OWNER_QA_CHECKLIST Phase 0–4' },
	{ label: 'Type-check gate', value: 'npm run check → 0 errors (CI)' },
];

export interface WaveWin {
	id: string;
	title: string;
	body: string;
}

/** Wave 4 competitive closure highlights */
export const ACQ_WAVE4_WINS: WaveWin[] = [
	{
		id: 'checkr',
		title: 'Checkr clearance lifecycle',
		body: 'Webhooks + director panopticon matrix — NCSI vendor swap remains acquirer decision.',
	},
	{
		id: 'roster-dnd',
		title: 'Registration roster assign',
		body: 'GotSport-style drag-drop panel wires season registration to roster placement.',
	},
	{
		id: 'brackets',
		title: 'Tournament brackets',
		body: 'Single- and double-elimination panels on tournament events.',
	},
	{
		id: 'fed-sync',
		title: 'Federation Phase 3 sync',
		body: 'CSV v1 export plus Phase 3 sync path — not 38-body live API parity.',
	},
	{
		id: 'streaming',
		title: 'Live stream embed',
		body: 'URL embed MVP on team workouts and match sessions — CDN tooling on schedule, not shipped as native CDN.',
	},
];

export interface DataRoomLink {
	label: string;
	path: string;
	audience?: string;
}

/** Repo diligence paths — matches docs/acquisition/INDEX.md */
export const ACQ_DATA_ROOM_LINKS: DataRoomLink[] = [
	{ label: 'Data room index', path: 'docs/acquisition/INDEX.md' },
	{ label: 'One pager', path: 'docs/acquisition/ONE_PAGER.md' },
	{ label: 'Prospectus', path: 'docs/acquisition/PROSPECTUS.md' },
	{ label: 'Traction & launch status', path: 'docs/acquisition/TRACTION.md' },
	{ label: 'Architecture', path: 'docs/ARCHITECTURE.md', audience: 'Eng' },
	{ label: 'Security & compliance', path: 'docs/acquisition/SECURITY.md', audience: 'InfoSec' },
	{ label: 'Functional MVP checklist', path: 'docs/vision/FUNCTIONAL_MVP.md' },
	{ label: 'Competitive assessment', path: 'docs/vision/COMPETITIVE_LAUNCH_ASSESSMENT.md' },
	{ label: 'Notable gaps (honest)', path: 'docs/acquisition/NOTABLE_GAPS.md' },
	{ label: 'Demo script', path: 'docs/acquisition/DEMO_SCRIPT.md', audience: 'Sales / QA' },
	{ label: 'Transfer checklist', path: 'docs/acquisition/TRANSFER.md', audience: 'Acquirer ops' },
	{ label: 'Functions deploy playbook', path: 'docs/FUNCTIONS_DEPLOY.md' },
];

export interface PrintSection {
	id: string;
	title: string;
	lead?: string;
	paragraphs?: string[];
	bullets?: string[];
	/** Simple two-column table rows [colA, colB] with optional header row via tableHeaders */
	tableHeaders?: [string, string];
	tableRows?: [string, string][];
}

/** Executive brief — ONE_PAGER + traction + Wave 4 + limitations */
export const EXECUTIVE_BRIEF_SECTIONS: PrintSection[] = [
	{
		id: 'problem',
		title: 'Problem',
		paragraphs: [
			'Youth sports clubs use TeamSnap or SportsEngine for schedules, RSVPs, and payments — then bolt on spreadsheets, group texts, and waiver PDFs for athlete development and minor safety.',
			'No incumbent owns the loop from coach intent → player training → XP → parent visibility with COPPA-native architecture.',
		],
	},
	{
		id: 'solution',
		title: 'Solution',
		paragraphs: [
			'SSTracker is a multi-tenant SaaS platform (Player · Parent · Coach · Director) on SvelteKit 5 + Firebase.',
		],
		bullets: [
			'Player OS — missions, Train logging, XP/skill tree, coach bounties, RL adaptive homework',
			'Parent OS — household graph, VPC ceremony, co-op logging, SafeSport-gated messaging',
			'Coach OS — Intent Engine, spatial drill designer, match-day, tryout lifecycle',
			'Director OS — eligibility matrix, field ops, compliance audit, registration',
		],
	},
	{
		id: 'moat',
		title: 'Moat (hard to copy)',
		tableHeaders: ['Capability', 'Why it matters'],
		tableRows: [
			['Train → XP → coach intent loop', 'Daily engagement competitors lack'],
			['Household-gated comms', 'No coach→minor unsupervised DM (rules + callables)'],
			['VPC + consent records + minor retention', 'COPPA depth beyond checkbox waivers'],
			['Cell-isolated Firestore', 'Federation-scale tenant blast-radius control'],
			['RL adaptive homework (Epic 8)', 'Policy/heuristic drill queue on player HQ'],
		],
	},
	{
		id: 'table-stakes',
		title: 'Table stakes (shipped in code)',
		paragraphs: [
			'RSVP · registration-lite + Stripe path · roster invite · tryouts OS (reg → eval → callback → roster) · eligibility matrix · parent push/calendar · PWA install · payment installments · drag-drop roster assign · tournament brackets (single + double-elim).',
		],
	},
	{
		id: 'traction',
		title: 'Traction & stage (honest)',
		tableHeaders: ['Signal', 'Status'],
		tableRows: [
			['Paying clubs / MAU / ARR', 'None documented · pre-commercial · $0 ARR'],
			['LAUNCH Wave 0–2', 'Done'],
			['Wave 3A gap closure + 3B deploy smoke', 'Done'],
			['Wave 4 competitive parity', 'Done — 2026-06-15'],
			['Owner FUNCTIONAL_MVP QA', 'Pending'],
			['Live QA environment', 'https://sstracker.app (sports-skill-tracker-dev)'],
		],
	},
	{
		id: 'wave4',
		title: 'Wave 4 wins',
		bullets: ACQ_WAVE4_WINS.map((w) => `${w.title}: ${w.body}`),
	},
	{
		id: 'limitations',
		title: 'Intentional limitations',
		bullets: ACQ_LIMITATIONS.map((l) => `${l.label} (${l.status}) — ${l.note}`),
	},
	{
		id: 'stack',
		title: 'Stack & diligence',
		paragraphs: [
			'Svelte 5 Runes · SvelteKit · Firebase (Auth, Firestore cells, Functions v2, Hosting, FCM) · Stripe · Vitest · Playwright',
			'Full data room: docs/acquisition/INDEX.md · Architecture: docs/ARCHITECTURE.md',
		],
	},
];

/** Prospectus print — condensed PROSPECTUS.md sections */
export const PROSPECTUS_PRINT_SECTIONS: PrintSection[] = [
	{
		id: 'exec-summary',
		title: '1. Executive summary',
		lead: WIN_MESSAGE,
		paragraphs: [
			'SSTracker is a compliance-first youth sports development platform targeting clubs that have outgrown schedule-and-chat tools but cannot sacrifice SafeSport and COPPA rigor.',
			'Acquisition thesis: buy a launch-ready functional OS with architectural moat (cell routing, household graph, RL homework path) rather than rebuild from TeamSnap/SportsEngine APIs.',
			'Remaining work is owner live deploy confirm, FUNCTIONAL_MVP QA, and go-to-market — not greenfield product invention.',
		],
	},
	{
		id: 'market',
		title: '2. Market position',
		tableHeaders: ['Platform', 'They win on · SSTracker wins on'],
		tableRows: [
			['TeamSnap ONE', 'Parent mobile, RSVP, reg, streaming · Development loop, compliance depth'],
			['SportsEngine HQ', 'Eligibility matrix, NGB, enterprise reg · Player OS, SafeSport comms model'],
			['GotSport', 'State roster / governing body sync · Gamified development, RL, intent engine'],
		],
		paragraphs: [
			'At parity (functional): RSVP, registration-lite, roster invite, tryouts OS, eligibility matrix, parent calendar/push, PWA, payment installments, roster assign panel, tournament brackets.',
			'Partial (accept v1): Capacitor native shell, NGB CSV export, live stream embed, Checkr embed, federation Phase 3 sync.',
			'Behind: App Store / Play Store binaries (intentional — acquirer). Leads: Player development, COPPA/VPC, SafeSport DM policy, coach spatial drills, RL homework.',
		],
	},
	{
		id: 'product',
		title: '3. Product surfaces',
		tableHeaders: ['Persona', 'Primary route · Status'],
		tableRows: [
			['Player', '/player/dashboard · Shipped — HQ, Train, Armory, Stats'],
			['Parent', '/parent/household · Shipped — VPC, co-op, bounties, messages'],
			['Coach', '/coach · Shipped — Forge, drills, match-day, logistics'],
			['Director', '/director · Shipped — compliance, field ops, registrars'],
			['Admin', '/admin · Shipped — orgs, RL policy, system'],
		],
	},
	{
		id: 'architecture',
		title: '4. Technical architecture',
		bullets: [
			'Client — Svelte 5 (Runes) + SvelteKit PWA (adapter-static)',
			'Edge — Firebase Hosting + /v1/** → apiGateway',
			'Compute — Cloud Functions v2 across 7 codebases (core, rl, compliance, platform, commerce, integrations, legacy monolith)',
			'Data — Isolated Firestore cells per tenant shard + registry DB',
			'Invariants — zero-liability PII, strict tenant isolation, lazy read-repair migrations, Vanguard Trinity UI pattern',
		],
		paragraphs: ['Canonical: docs/ARCHITECTURE.md · Deploy: docs/FUNCTIONS_DEPLOY.md'],
	},
	{
		id: 'compliance',
		title: '5. Compliance & trust',
		bullets: [
			'VPC ceremony — parent-granted consent; consent_records + security_audit server-side',
			'SafeSport — sendCoachPlayerMessage blocks coach→minor unsupervised DM',
			'Minor retention — purge queue + scheduled burn (functions-compliance)',
			'WebAuthn / passkeys — parent magic-link → passkey enrollment path',
			'Coach clearance — Checkr embed + director panopticon; NCSI vendor parity = acquirer',
		],
	},
	{
		id: 'moat-features',
		title: '6. Differentiated features',
		bullets: [
			'Coach Intent Engine + Train lock — prescription-locked sessions with editable session notes only',
			'Tryout lifecycle OS — public registration through roster promote + automated comms',
			'RL adaptive homework — HQ mount + callables; launch default abPercent: 0 (heuristic only)',
			'Spatial drill designer — team + club libraries persisting to teams/{teamId}/drills',
		],
	},
	{
		id: 'quality',
		title: '7. Build & quality status',
		tableHeaders: ['Signal', 'Status'],
		tableRows: [
			['Functional audit A–F', 'Done'],
			['LAUNCH Wave 0–2', 'Done'],
			['Overnight P2 + check=0', 'Done — merged dev 2026-06-13'],
			['Wave 3A + 3B', 'Done'],
			['Wave 4 competitive parity', 'Done — 2026-06-15'],
			['Owner human QA on FUNCTIONAL_MVP', 'Pending'],
			['TypeScript npm run check', '0 errors — CI gate'],
		],
	},
	{
		id: 'assets',
		title: '8. What acquirer gets',
		bullets: [
			'Full monorepo — SvelteKit app, 7 function codebases, Firestore + storage rules',
			'Vision + sprint docs under docs/vision/',
			'Test suite — Vitest guards, Firestore rules emulators, Playwright e2e scaffold',
			'QA provisioning — scripts/dev-tenant-reset.mjs',
			'Dev QA: sports-skill-tracker-dev → https://sstracker.app',
		],
	},
	{
		id: 'remaining',
		title: '9. Remaining launch work (post-acquisition)',
		bullets: [
			'Owner live deploy confirm if callables not yet live on dev',
			'Owner QA — OWNER_QA_CHECKLIST Phase 0–4',
			'Deferred — avatar PNG art, platform visual redesign, federation API Phases 2–4 (owner GTM)',
			'Acquirer — App Store / Play Store binaries, NCSI vendor parity, club website CMS (rejected)',
		],
	},
	{
		id: 'risks',
		title: '10. Risk factors',
		bullets: [
			'Pre-revenue / pre-scale user base',
			'Firebase vendor concentration',
			'Split codebase deploy complexity',
			'Federation API Phases 2–4 gap vs GotSport for state-governing-body GTM',
			'No club website builder (intentional)',
			'App Store / Play Store distribution (intentional — acquirer)',
		],
	},
	{
		id: 'contact',
		title: '11. Contact & data room',
		paragraphs: [
			'Acquisition inquiries: acquisition@sstracker.com',
			'QA tenant: club qa_launch_2026 — provision via node scripts/dev-tenant-reset.mjs --provision',
			'Data room index: docs/acquisition/INDEX.md',
		],
	},
];

export const ACQ_CONTACT_EMAIL = 'acquisition@sstracker.com';
