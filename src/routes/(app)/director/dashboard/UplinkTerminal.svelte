<script lang="ts">
	/**
	 * UplinkTerminal.svelte
	 * ──────────────────────
	 * Phase 2, Epic 3 — Passwordless Magic Uplinks.
	 *
	 * Shell wrapper that mounts the MagicUplinkComposer.
	 * The legacy `generateInviteCode` short-code flow has been replaced by
	 * the passwordless Magic Uplink system (single-use, scrypt-hashed,
	 * email-dispatched invite tokens).
	 */

	import MagicUplinkComposer from '$lib/components/director/onboard/MagicUplinkComposer.svelte';

	type Props = {
		currentClubId: string;
		clubTeams: Array<{ id: string; name: string }>;
	};

	const { currentClubId, clubTeams }: Props = $props();
</script>

<MagicUplinkComposer {currentClubId} {clubTeams} />
