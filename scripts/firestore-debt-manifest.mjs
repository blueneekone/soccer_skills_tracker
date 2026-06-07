/**
 * Canonical Firestore debt tiers for sports-skill-tracker-dev full pass.
 * Authority: FUNCTIONAL_MVP.md + firestore.rules + src/functions refs.
 */

/** Never bulk-delete without legal review */
export const PROTECTED_ROOTS = new Set([
	'consents',
	'consent_logs',
	'consent_tokens',
	'consent_records',
	'pii_vault',
	'minor_retention_queue',
]);

/**
 * Roots that must survive a debt pass (schema + QA tenant).
 * Empty collections are fine — recreated on use.
 */
export const KEEP_ROOTS = new Set([
	// Tenant & identity
	'users',
	'clubs',
	'teams',
	'organizations',
	'households',
	'coach_lookup',
	'registrar_lookup',
	'player_lookup',
	// Billing / config
	'config',
	'license_entitlements',
	'licenses',
	'sports_configs',
	'pricing_policy',
	'pricing_policy_audit',
	'platform_config',
	// Parent / player OS
	'operative_dispatches',
	'auth_challenges',
	'workout_logs',
	'player_media',
	'global_drills',
	'team_assignments',
	// RL (singleton + logs)
	'rl_policy_state',
	'rl_inference_log',
	'rl_transitions',
	'rl_safety_overrides',
	// Admin aggregate (CF-maintained)
	'analytics',
	// Comms (launch)
	'in_app_messages',
	'messaging_audit',
	// Invites / onboarding
	'invites',
	'coach_invites',
	// Facility top-level (club-scoped docs also under clubs/{id}/facilities)
	'fields',
	'facilities',
	'facility_bookings',
	'deployment_calendar_entries',
	// Misc platform
	'public_player_profiles',
	'device_tokens',
	'cells',
	'gateway_idempotency',
	'gateway_rate_buckets',
	'cell_promotion_queue',
	'platform_fee_ledger',
	'mail',
	'clearance_records',
	'pending_deletions',
]);

/** Always wipe all documents (unwired or superseded) */
export const WIPE_ROOTS_ALWAYS = [
	'logs_system',
	'workouts', // legacy root — canonical: users/{email}/workouts
];

/** Ops / audit history — default ON for full debt pass */
export const WIPE_ROOTS_OPS_HISTORY = [
	'security_audit',
	'rl_training_runs',
	'sport_audit_report',
	'audit_logs',
];

/** Gameplay / mission stale data — wipe all docs; schema stays in rules/code */
export const WIPE_ROOTS_OPERATIONAL = [
	'assigned_missions',
	'assignments',
	'active_missions',
	'missions',
	'player_stats',
	'reps',
	'trials',
	'trial_scores',
	'evaluations',
	'drill_completions',
	'grit_awards',
	'bounties',
	'bounty_completions',
	'bounty_audit',
	'passports',
	'vpc_requests',
	'passkey_challenges',
	'rosters',
	'team_workouts',
	'schedules',
	'team_stats',
	'team_entitlements',
	'team_broadcasts',
	'magic_uplinks',
	'magic_uplink_audit',
	'reengagement_alerts',
	'roster_drop_requests',
	'seasons',
	'fixtures',
	'match_results',
	'match_results_public',
	'eq_attestations',
	'opponents',
	'season_registrations',
	'player_eligibility',
	'roster_links',
	'tickets',
	'tournament_events',
	'recruiters',
	'recruiter_accounts',
	'recruiter_export_log',
	'recruiter_watchlist',
	'recruiter_handshakes',
	'stat_history',
	'academic_records',
	'tutor_assignments',
	'transfer_tokens',
	'transfer_history',
	'alpha_feedback',
	'ad_block_audit',
	'egress_block_audit',
	'partner_webhook_log',
	'affinity_ingest_raw',
	'affinity_webhook_events',
	'physio_self_reports',
	'hotel_partners',
	'hotel_rebates',
	'club_playbooks',
];

/** Wiped only with --wipe-seed-data */
export const WIPE_ROOTS_SEED = ['global_drills'];

/** Allowed subcollections under kept parent docs */
export const ALLOWED_SUBCOLLECTIONS = {
	users: new Set([
		'passkeys',
		'passkey_challenges',
		'workouts',
		'workout_logs',
		'xpHistory',
		'cosmetic_unlocks',
		'telemetry_boosts',
		'memory_capsules',
		'trajectory_months',
	]),
	clubs: new Set(['facilities', 'campaigns', 'channels', 'fee_summary']),
	teams: new Set(['channels', 'telemetry_events', 'tactics', 'drills', 'workouts']),
	organizations: new Set(['fee_summary']),
	households: new Set(['thread_messages']),
};

export const DEFAULT_KEEP_EMAILS =
	'ecwaechtler@gmail.com,ecwaechtler+parent@gmail.com,ecwaechtler+coach@gmail.com,aaron.hanks0287@gmail.com';

export const PARENT_EMAIL = 'ecwaechtler+parent@gmail.com';
