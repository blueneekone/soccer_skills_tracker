<script lang="ts">
	import '$lib/styles/comms-hub-persona-skins.css';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import type { Snippet } from 'svelte';

	let { children }: { children?: Snippet } = $props();

	const role = $derived(authStore.role);

	const personaKind = $derived(
		role === 'player'
			? 'player'
			: role === 'coach'
				? 'coach'
				: role === 'parent'
					? 'parent'
					: role === 'director'
						? 'director'
						: 'staff',
	);

	const strapTitle = $derived(
		role === 'player'
			? 'Operative Comms'
			: role === 'coach'
				? 'Staff SIEM Inbox'
				: role === 'parent'
					? 'Parent Lounge'
					: role === 'director'
						? 'Club Ops Oversight'
						: 'Messages',
	);
</script>

<div
	class="comms-hub"
	class:comms-hub--player={personaKind === 'player'}
	class:comms-hub--coach={personaKind === 'coach'}
	class:comms-hub--parent={personaKind === 'parent'}
	class:comms-hub--director={personaKind === 'director'}
	class:comms-hub--staff={personaKind === 'staff'}
>
	<header class="comms-hub-z4-chrome">
		<div class="comms-hub-z4-chrome__strap">
			<p class="comms-hub-z4-chrome__eyebrow">Comms Hub</p>
			<h1 class="comms-hub-z4-chrome__title">{strapTitle}</h1>
		</div>
	</header>
	<div class="comms-hub-z1-well">
		{@render children?.()}
	</div>
</div>
