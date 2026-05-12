/**
 * physicalSnowflakeTaxonomy.ts
 * ─────────────────────────────
 * Authored synthetic taxonomy for the Phase 3 / Epic 5 Composite Snowflake.
 *
 * This file is the ONLY authoritative source for synthetic node definitions.
 * It contains zero Firestore dependencies — the backend knowledge graph
 * (mapping these synthetic action abstractions to raw "Drill-as-Node"
 * curriculum primitives) is intentionally deferred to a dedicated backend
 * sprint, as required by the Anti-Monolith Protocol.
 *
 * Taxonomy design principles
 * ──────────────────────────
 * • Each ScoutsSix attribute (PAC, ACC, POW, VAN, STM, AGI) gets exactly
 *   5 synthetic nodes branching outward across 3 rings.
 * • `threshold` values are calibrated to the normalise() formula in
 *   VanguardPrism.svelte so that node "unlock" states correlate to
 *   physically meaningful rating milestones:
 *     PAC: threshold 0.2 ≈ 7 MPH, 0.5 ≈ 17.5 MPH, 0.7 ≈ 24.5 MPH
 *     ACC: threshold 0.2 ≈ 2.9s (0-5yd), 0.6 ≈ 1.7s, 0.8 ≈ 0.9s
 *     POW: threshold 0.2 ≈ 11 in, 0.5 ≈ 27.5 in, 0.7 ≈ 38.5 in
 *     VAN: threshold = composite score ÷ 99 directly
 *     STM: threshold = RPG level ÷ 99 directly
 *     AGI: threshold 0.2 ≈ 7.6s, 0.6 ≈ 4.8s, 0.8 ≈ 2.6s
 * • `parentNodeId: null` on rank-1 nodes — they connect directly to the
 *   prism core via spoke lines. Deeper ranks chain from the nearest
 *   same-branch trunk node.
 * • Fan offset slots: −25°, −15°, 0°, 15°, 25°.
 *   Rank-1 trunk always at 0°. Rank-2 at ±15°. Rank-3 at ±15° mirroring
 *   their rank-2 parent.
 *
 * Fog of War hook
 * ───────────────
 * `isNodeVisible(nodeId)` in SkillTreeEngine defaults to `true` today.
 * Epic 7 will swap that predicate; all the adjacency data needed is
 * encoded right here in `rank` + `parentNodeId`.
 */

import type { ScoutsSix } from '$lib/states/ArmoryEngine.svelte.js';

// ── Type definition ──────────────────────────────────────────────────────────

export type SyntheticNode = {
	/** Stable kebab-case identifier, unique across the entire taxonomy. */
	id: string;
	/** Which ScoutsSix attribute branch this node belongs to. */
	parentAttr: keyof ScoutsSix;
	/** Human-readable synthetic name shown in the HUD detail panel. */
	label: string;
	/** One-line description for the HUD tooltip / detail panel. */
	description: string;
	/** Ring distance from the core prism (1 = closest). */
	rank: 1 | 2 | 3;
	/**
	 * Angular offset from the branch axis in degrees.
	 * Valid values: −25, −15, 0, 15, 25.
	 */
	fanOffsetDeg: -25 | -15 | 0 | 15 | 25;
	/**
	 * Normalised rating (0..1) at which this node transitions from
	 * 'locked' to 'unlocked'. Calibrated to match the VanguardPrism
	 * normalise() formula for the parent attribute.
	 */
	threshold: number;
	/**
	 * ID of the parent node in this branch, or `null` for rank-1 nodes
	 * (which connect directly to the prism core via a spoke line).
	 */
	parentNodeId: string | null;
};

// ── PAC branch (speed) ───────────────────────────────────────────────────────
//   normalise: n / 35 (mph). threshold 0.2 ≈ 7 mph, 0.4 ≈ 14 mph, 0.65 ≈ 22.75 mph.

const PAC_NODES: SyntheticNode[] = [
	{
		id: 'pac.first-step',
		parentAttr: 'PAC',
		label: 'First Step',
		description: 'Drive off the standing leg with maximum hip extension on the initial stride.',
		rank: 1,
		fanOffsetDeg: 0,
		threshold: 0.18,
		parentNodeId: null,
	},
	{
		id: 'pac.burst-speed',
		parentAttr: 'PAC',
		label: 'Burst Speed',
		description: 'Sustain acceleration through the first 10 yards without over-striding.',
		rank: 2,
		fanOffsetDeg: -15,
		threshold: 0.35,
		parentNodeId: 'pac.first-step',
	},
	{
		id: 'pac.top-end-pace',
		parentAttr: 'PAC',
		label: 'Top-End Pace',
		description: 'Hold maximum velocity for at least 20 yards under match conditions.',
		rank: 2,
		fanOffsetDeg: 15,
		threshold: 0.40,
		parentNodeId: 'pac.first-step',
	},
	{
		id: 'pac.explosive-start',
		parentAttr: 'PAC',
		label: 'Explosive Start',
		description: 'Sub-1.8s 0-10 yd reaction sprint from a static defensive position.',
		rank: 3,
		fanOffsetDeg: -15,
		threshold: 0.58,
		parentNodeId: 'pac.burst-speed',
	},
	{
		id: 'pac.sprint-endurance',
		parentAttr: 'PAC',
		label: 'Sprint Endurance',
		description: 'Maintain near-peak sprint speed across repeated efforts in the final 30 minutes.',
		rank: 3,
		fanOffsetDeg: 15,
		threshold: 0.68,
		parentNodeId: 'pac.top-end-pace',
	},
];

// ── ACC branch (acceleration) ────────────────────────────────────────────────
//   normalise: (3.5 − n) / 3 (seconds, lower = faster). threshold 0.2 ≈ 2.9s, 0.6 ≈ 1.7s.

const ACC_NODES: SyntheticNode[] = [
	{
		id: 'acc.react-and-drive',
		parentAttr: 'ACC',
		label: 'React & Drive',
		description: 'Immediate weight transfer on the first cue, eliminating wasted pre-step movement.',
		rank: 1,
		fanOffsetDeg: 0,
		threshold: 0.18,
		parentNodeId: null,
	},
	{
		id: 'acc.hip-turn',
		parentAttr: 'ACC',
		label: 'Hip Turn',
		description: 'Open or close the hip correctly to redirect momentum without losing ground.',
		rank: 2,
		fanOffsetDeg: -15,
		threshold: 0.38,
		parentNodeId: 'acc.react-and-drive',
	},
	{
		id: 'acc.power-step',
		parentAttr: 'ACC',
		label: 'Power Step',
		description: 'Maximise ground contact force through a stiff-ankle toe-off on the first stride.',
		rank: 2,
		fanOffsetDeg: 15,
		threshold: 0.44,
		parentNodeId: 'acc.react-and-drive',
	},
	{
		id: 'acc.false-start',
		parentAttr: 'ACC',
		label: 'False Start',
		description: 'Combine a deceptive body-feint with a true acceleration burst to beat a defender.',
		rank: 3,
		fanOffsetDeg: -15,
		threshold: 0.62,
		parentNodeId: 'acc.hip-turn',
	},
	{
		id: 'acc.jet-cuts',
		parentAttr: 'ACC',
		label: 'Jet Cuts',
		description: 'Plant-and-go direction changes executed at full running pace without pace loss.',
		rank: 3,
		fanOffsetDeg: 15,
		threshold: 0.72,
		parentNodeId: 'acc.power-step',
	},
];

// ── POW branch (explosive power) ─────────────────────────────────────────────
//   normalise: n / 55 (inches standing broad jump). threshold 0.2 ≈ 11 in, 0.65 ≈ 35.75 in.

const POW_NODES: SyntheticNode[] = [
	{
		id: 'pow.loaded-stance',
		parentAttr: 'POW',
		label: 'Loaded Stance',
		description: 'Pre-load the posterior chain with optimal knee angle and hip hinge before each effort.',
		rank: 1,
		fanOffsetDeg: 0,
		threshold: 0.18,
		parentNodeId: null,
	},
	{
		id: 'pow.ground-strike',
		parentAttr: 'POW',
		label: 'Ground Strike',
		description: 'Convert stored elastic energy into ball-striking force through clean hip lock and follow-through.',
		rank: 2,
		fanOffsetDeg: -15,
		threshold: 0.36,
		parentNodeId: 'pow.loaded-stance',
	},
	{
		id: 'pow.vertical-leap',
		parentAttr: 'POW',
		label: 'Vertical Leap',
		description: 'Triple-extension jump mechanics — ankle, knee, and hip firing in sequence for maximum height.',
		rank: 2,
		fanOffsetDeg: 15,
		threshold: 0.42,
		parentNodeId: 'pow.loaded-stance',
	},
	{
		id: 'pow.power-header',
		parentAttr: 'POW',
		label: 'Power Header',
		description: 'Combine vertical leap with trunk rotation and a stiff neck to redirect aerial balls with authority.',
		rank: 3,
		fanOffsetDeg: -15,
		threshold: 0.60,
		parentNodeId: 'pow.vertical-leap',
	},
	{
		id: 'pow.long-drive',
		parentAttr: 'POW',
		label: 'Long Drive',
		description: 'Strike the ball from range beyond 35 yards with enough velocity to challenge a goalkeeper.',
		rank: 3,
		fanOffsetDeg: 15,
		threshold: 0.70,
		parentNodeId: 'pow.ground-strike',
	},
];

// ── VAN branch (vanguard composite) ──────────────────────────────────────────
//   normalise: n / 99 (composite score). threshold is a direct composite rating.

const VAN_NODES: SyntheticNode[] = [
	{
		id: 'van.body-balance',
		parentAttr: 'VAN',
		label: 'Body Balance',
		description: 'Maintain a low, stable centre of gravity when receiving contact or changing direction.',
		rank: 1,
		fanOffsetDeg: 0,
		threshold: 0.22,
		parentNodeId: null,
	},
	{
		id: 'van.work-rate',
		parentAttr: 'VAN',
		label: 'Work Rate',
		description: 'Sustain pressing intensity and off-ball running output across the full 90 minutes.',
		rank: 2,
		fanOffsetDeg: -15,
		threshold: 0.45,
		parentNodeId: 'van.body-balance',
	},
	{
		id: 'van.elite-readiness',
		parentAttr: 'VAN',
		label: 'Elite Readiness',
		description: 'Arrive at every session with full physical and mental preparation markers in the green.',
		rank: 2,
		fanOffsetDeg: 15,
		threshold: 0.52,
		parentNodeId: 'van.body-balance',
	},
	{
		id: 'van.tactical-engine',
		parentAttr: 'VAN',
		label: 'Tactical Engine',
		description: 'Translate physical capacity into positional intelligence — the right run at the right moment.',
		rank: 3,
		fanOffsetDeg: -15,
		threshold: 0.68,
		parentNodeId: 'van.work-rate',
	},
	{
		id: 'van.vanguard-form',
		parentAttr: 'VAN',
		label: 'Vanguard Form',
		description: 'Peak physical condition across all six attributes simultaneously — the pinnacle composite state.',
		rank: 3,
		fanOffsetDeg: 15,
		threshold: 0.78,
		parentNodeId: 'van.elite-readiness',
	},
];

// ── STM branch (stamina) ──────────────────────────────────────────────────────
//   normalise: n / 99 (RPG level). threshold is level ÷ 99.

const STM_NODES: SyntheticNode[] = [
	{
		id: 'stm.base-fitness',
		parentAttr: 'STM',
		label: 'Base Fitness',
		description: 'Build the foundational aerobic base that underpins all other physical attributes.',
		rank: 1,
		fanOffsetDeg: 0,
		threshold: 0.18,
		parentNodeId: null,
	},
	{
		id: 'stm.interval-recovery',
		parentAttr: 'STM',
		label: 'Interval Recovery',
		description: 'Return heart rate to sub-160 bpm within 90 seconds after a maximal sprint effort.',
		rank: 2,
		fanOffsetDeg: -15,
		threshold: 0.35,
		parentNodeId: 'stm.base-fitness',
	},
	{
		id: 'stm.pressing-engine',
		parentAttr: 'STM',
		label: 'Pressing Engine',
		description: 'Execute structured high-intensity press for 10+ minutes without positional breakdown.',
		rank: 2,
		fanOffsetDeg: 15,
		threshold: 0.42,
		parentNodeId: 'stm.base-fitness',
	},
	{
		id: 'stm.90-min-wall',
		parentAttr: 'STM',
		label: '90-Min Wall',
		description: 'Sustain 80%+ sprint pace coverage in minutes 75–90 and any added time.',
		rank: 3,
		fanOffsetDeg: -15,
		threshold: 0.62,
		parentNodeId: 'stm.interval-recovery',
	},
	{
		id: 'stm.iron-lungs',
		parentAttr: 'STM',
		label: 'Iron Lungs',
		description: 'Achieve VO₂ max ceiling sufficient to play elite 90-minute match loads without substitution fatigue.',
		rank: 3,
		fanOffsetDeg: 15,
		threshold: 0.72,
		parentNodeId: 'stm.pressing-engine',
	},
];

// ── AGI branch (agility) ──────────────────────────────────────────────────────
//   normalise: (9 − n) / 7 (seconds, lower = faster). threshold 0.2 ≈ 7.6s, 0.6 ≈ 4.8s, 0.75 ≈ 3.75s.

const AGI_NODES: SyntheticNode[] = [
	{
		id: 'agi.lateral-shuffle',
		parentAttr: 'AGI',
		label: 'Lateral Shuffle',
		description: 'Rapid side-to-side defensive footwork keeping hips square and weight centred.',
		rank: 1,
		fanOffsetDeg: 0,
		threshold: 0.18,
		parentNodeId: null,
	},
	{
		id: 'agi.cone-weave',
		parentAttr: 'AGI',
		label: 'Cone Weave',
		description: 'Navigate tight-gap direction change drills with consistent deceleration control.',
		rank: 2,
		fanOffsetDeg: -15,
		threshold: 0.36,
		parentNodeId: 'agi.lateral-shuffle',
	},
	{
		id: 'agi.hip-fluidity',
		parentAttr: 'AGI',
		label: 'Hip Fluidity',
		description: 'Fluid pelvic rotation enabling smooth directional changes without micro-pauses.',
		rank: 2,
		fanOffsetDeg: 15,
		threshold: 0.42,
		parentNodeId: 'agi.lateral-shuffle',
	},
	{
		id: 'agi.scissors-step',
		parentAttr: 'AGI',
		label: 'Scissors Step',
		description: 'Execute deceptive multi-step footwork patterns that commit defenders before the real cut.',
		rank: 3,
		fanOffsetDeg: -15,
		threshold: 0.60,
		parentNodeId: 'agi.cone-weave',
	},
	{
		id: 'agi.change-of-speed',
		parentAttr: 'AGI',
		label: 'Change of Speed',
		description: 'Shift between slow-fast-slow tempo within a single dribbling sequence to unbalance markers.',
		rank: 3,
		fanOffsetDeg: 15,
		threshold: 0.68,
		parentNodeId: 'agi.hip-fluidity',
	},
];

// ── Merged export ─────────────────────────────────────────────────────────────

/** All 30 synthetic nodes in branch order. */
export const PHYSICAL_SNOWFLAKE_TAXONOMY: readonly SyntheticNode[] = [
	...PAC_NODES,
	...ACC_NODES,
	...POW_NODES,
	...VAN_NODES,
	...STM_NODES,
	...AGI_NODES,
] as const;

/** Quick lookup: node by id. */
export const TAXONOMY_BY_ID: Readonly<Record<string, SyntheticNode>> =
	Object.fromEntries(PHYSICAL_SNOWFLAKE_TAXONOMY.map((n) => [n.id, n]));

/** Nodes grouped by parent attribute. */
export const TAXONOMY_BY_ATTR: Readonly<Record<keyof ScoutsSix, readonly SyntheticNode[]>> = {
	PAC: PAC_NODES,
	ACC: ACC_NODES,
	POW: POW_NODES,
	VAN: VAN_NODES,
	STM: STM_NODES,
	AGI: AGI_NODES,
};
