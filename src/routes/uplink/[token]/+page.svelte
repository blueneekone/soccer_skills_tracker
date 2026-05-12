<script lang="ts">
	/**
	 * /uplink/[token] — Magic Uplink public redemption page.
	 * ────────────────────────────────────────────────────────
	 * Shell layer (Vanguard Trinity pattern).
	 *
	 * Public — no auth required.  The URL token itself IS the credential.
	 * Reads `params.token`, instantiates the Brain (UplinkRedeemEngine), and
	 * renders the Glass (UplinkRedeemArena).
	 *
	 * Flow:
	 *   1. Extract full `<tokenId>.<secret>` from page params.
	 *   2. Call engine.redeem() via $effect on mount.
	 *   3. Engine calls redeemMagicUplink CF → signInWithCustomToken.
	 *   4. On success engine calls goto(redirectTo) wrapped in untrack().
	 */

	import { page } from '$app/state';
	import { UplinkRedeemEngine } from '$lib/components/uplink/UplinkRedeemEngine.svelte.js';
	import UplinkRedeemArena from '$lib/components/uplink/UplinkRedeemArena.svelte';

	const token = $derived(page.params.token ?? '');
	const engine = new UplinkRedeemEngine();

	$effect(() => {
		if (token) {
			engine.redeem(token);
		}
	});
</script>

<svelte:head>
	<title>Activating your Vanguard account…</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<UplinkRedeemArena {engine} />
