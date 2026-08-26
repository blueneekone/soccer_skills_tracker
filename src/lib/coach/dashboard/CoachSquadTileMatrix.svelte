<script lang="ts">
	import { onMount } from 'svelte';
	import { db } from '$lib/firebase.js';
	import { collection, query, where, onSnapshot, doc, getDoc, type Unsubscribe } from 'firebase/firestore';
	import { isFirestoreReady } from '$lib/utils/firestoreGuard.js';
	import { authStore } from '$lib/stores/auth.svelte.js';

	interface Props {
		teamId: string;
	}

	interface SquadMember {
		id: string;
		name: string;
		jersey: string;
		parentEmail: string;
		parentPhone: string;
		hasGuardian: boolean;
		initials: string;
	}

	let { teamId }: Props = $props();

	let members = $state<SquadMember[]>([]);
	let loading = $state(true);
	let dispatchCode = $state('');

	function getInitials(name: string): string {
		const parts = name.trim().split(/\s+/);
		if (parts.length >= 2) {
			return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
		}
		return name.slice(0, 2).toUpperCase() || 'PL';
	}

	$effect(() => {
		if (!isFirestoreReady() || !teamId || !authStore.isAuthenticated) {
			loading = false;
			return;
		}

		loading = true;

		// 1. Fetch team dispatch code
		getDoc(doc(db, 'teams', teamId))
			.then((snap) => {
				if (snap.exists()) {
					dispatchCode = snap.data()?.dispatchCode || snap.data()?.joinCode || '';
				}
			})
			.catch(() => {});

		// 2. Realtime listener on player_lookup
		const q = query(collection(db, 'player_lookup'), where('teamId', '==', teamId));
		const unsub: Unsubscribe = onSnapshot(
			q,
			(snap) => {
				const playerMap = new Map<string, SquadMember>();

				for (const docSnap of snap.docs) {
					const data = docSnap.data() || {};
					const name = (typeof data.playerName === 'string' && data.playerName.trim()) ||
						(typeof data.displayName === 'string' && data.displayName.trim()) || docSnap.id;
					const nameKey = name.toLowerCase();

					const email = docSnap.id.includes('@') ? docSnap.id : (typeof data.parentEmail === 'string' ? data.parentEmail : '');
					const phone = typeof data.parentPhone === 'string' ? data.parentPhone : '';
					const jersey = typeof data.jersey === 'string' ? data.jersey : (data.jersey ? String(data.jersey) : '');

					const existing = playerMap.get(nameKey);
					if (existing) {
						if (!existing.parentEmail && email) existing.parentEmail = email;
						if (!existing.parentPhone && phone) existing.parentPhone = phone;
						if (!existing.jersey && jersey) existing.jersey = jersey;
						existing.hasGuardian = Boolean(existing.parentEmail || existing.parentPhone);
					} else {
						playerMap.set(nameKey, {
							id: docSnap.id,
							name,
							jersey,
							parentEmail: email,
							parentPhone: phone,
							hasGuardian: Boolean(email || phone),
							initials: getInitials(name),
						});
					}
				}

				members = Array.from(playerMap.values()).sort((a, b) => a.name.localeCompare(b.name));
				loading = false;
			},
			(err) => {
				console.error('[CoachSquadTileMatrix] fetch error', err);
				loading = false;
			}
		);

		return () => unsub();
	});
</script>

<div class="squad-matrix-panel tw-w-full">
	<!-- Header Bar -->
	<div class="tw-flex tw-items-center tw-justify-between tw-gap-3 tw-mb-3 tw-flex-wrap">
		<div class="tw-flex tw-items-center tw-gap-2.5">
			<span class="tw-font-mono tw-text-xs tw-font-bold tw-text-[#14b8a6] tw-tracking-widest tw-uppercase">
				Squad Operatives
			</span>
			<span class="tw-font-mono tw-text-[11px] tw-font-bold tw-text-[#daff0a] tw-bg-[#daff0a]/10 tw-border tw-border-[#daff0a]/30 tw-px-2 tw-py-0.5 tw-rounded">
				{members.length} Active
			</span>
			{#if dispatchCode}
				<span class="tw-font-mono tw-text-[10px] tw-text-[#94a3b8] tw-bg-[#020617] tw-border tw-border-[#334155] tw-px-2 tw-py-0.5 tw-rounded tw-hidden sm:tw-inline-block">
					CODE: <strong class="tw-text-white">{dispatchCode}</strong>
				</span>
			{/if}
		</div>

		<a
			href="/coach/logistics?tab=roster"
			class="tw-font-mono tw-text-[11px] tw-font-bold tw-text-[#14b8a6] hover:tw-text-[#2dd4bf] tw-transition-colors tw-flex tw-items-center tw-gap-1.5 tw-no-underline hover:tw-underline tw-ml-auto"
		>
			Manage Roster & Ingest →
		</a>
	</div>

	{#if loading}
		<div class="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 lg:tw-grid-cols-3 xl:tw-grid-cols-4 tw-gap-2.5">
			{#each [0, 1, 2, 3] as i (i)}
				<div class="tw-h-16 tw-bg-[#1e293b]/50 tw-border tw-border-[#334155] tw-rounded-lg tw-animate-pulse"></div>
			{/each}
		</div>
	{:else if members.length === 0}
		<div class="tw-p-6 tw-bg-[#020617] tw-border tw-border-dashed tw-border-[#334155] tw-rounded-lg tw-text-center">
			<p class="tw-font-mono tw-text-xs tw-text-[#94a3b8] tw-mb-3">No athletes discovered on squad roster yet.</p>
			<a
				href="/coach/logistics?tab=roster"
				class="tw-inline-block tw-font-mono tw-text-xs tw-font-bold tw-text-[#0f172a] tw-bg-[#14b8a6] hover:tw-bg-[#2dd4bf] tw-px-4 tw-py-2 tw-rounded tw-transition-all tw-no-underline"
			>
				+ Ingest Roster CSV / Add Athlete
			</a>
		</div>
	{:else}
		<!-- Compact Squad Grid -->
		<div class="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 lg:tw-grid-cols-3 xl:tw-grid-cols-4 tw-gap-2.5">
			{#each members as player (player.id)}
				<div class="squad-tile tw-group tw-relative tw-p-3 tw-bg-[#020617] tw-border tw-border-[#334155] hover:tw-border-[#14b8a6]/60 tw-rounded-lg tw-flex tw-items-center tw-gap-3 tw-transition-all hover:tw-bg-[#0b1329]">
					<!-- Jersey / Avatar Badge -->
					<div class="tw-relative tw-shrink-0">
						{#if player.jersey}
							<div class="tw-w-9 tw-h-9 tw-rounded-md tw-bg-[#daff0a] tw-text-[#0f172a] tw-font-mono tw-font-black tw-text-xs tw-flex tw-items-center tw-justify-center tw-shadow-sm tw-tracking-tight">
								#{player.jersey}
							</div>
						{:else}
							<div class="tw-w-9 tw-h-9 tw-rounded-md tw-bg-[#1e293b] tw-border tw-border-[#334155] tw-text-[#14b8a6] tw-font-mono tw-font-bold tw-text-xs tw-flex tw-items-center tw-justify-center">
								{player.initials}
							</div>
						{/if}
					</div>

					<!-- Details -->
					<div class="tw-min-w-0 tw-flex-1">
						<div class="tw-flex tw-items-center tw-gap-1.5">
							<span class="tw-font-bold tw-text-xs tw-text-[#fafafa] tw-truncate group-hover:tw-text-[#2dd4bf] tw-transition-colors">
								{player.name}
							</span>
						</div>

						<div class="tw-flex tw-items-center tw-gap-2 tw-mt-0.5">
							{#if player.parentEmail}
								<span class="tw-font-mono tw-text-[10px] tw-text-[#14b8a6] tw-truncate" title={player.parentEmail}>
									✉ {player.parentEmail}
								</span>
							{:else if player.parentPhone}
								<span class="tw-font-mono tw-text-[10px] tw-text-[#94a3b8] tw-truncate">
									📞 {player.parentPhone}
								</span>
							{:else}
								<span class="tw-font-mono tw-text-[10px] tw-text-[#f59e0b] tw-truncate">
									⚠ Pending Email
								</span>
							{/if}
						</div>
					</div>

					<!-- Status Dot -->
					<div
						class="tw-w-2 tw-h-2 tw-rounded-full tw-shrink-0"
						class:tw-bg-[#14b8a6]={player.hasGuardian}
						class:tw-bg-[#f59e0b]={!player.hasGuardian}
						title={player.hasGuardian ? 'Guardian Linked' : 'Guardian Pending'}
					></div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.squad-matrix-panel {
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 8px;
		padding: 16px;
	}

	.squad-tile {
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	}
</style>
