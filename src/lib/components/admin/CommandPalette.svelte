<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import { db, auth, functions } from '$lib/firebase.js';
	import { httpsCallable } from 'firebase/functions';
	import { signInWithCustomToken } from 'firebase/auth';
	import { impersonationStore } from '$lib/stores/impersonation.svelte.js';
	import { collection, query, orderBy, startAt, endAt, limit, getDocs } from 'firebase/firestore';

	let { open = $bindable(false) } = $props();

	let searchQuery = $state('');
	let results = $state<any[]>([]);
	let selectedIndex = $state(0);
	let isSearching = $state(false);

	
	let debounceTimer: ReturnType<typeof setTimeout>;

	const impersonateUserFn = httpsCallable(functions, 'impersonateUser');
	let impersonating = $state('');

	async function doImpersonate(item: any) {
		const ok = confirm(`Begin impersonation session as ${item.name}?`);
		if (!ok) return;

		impersonating = item.id;
		try {
			const res = await impersonateUserFn({ targetUid: item.id, targetEmail: item.name });
			const payload = (res.data || {}) as { customToken?: string };
			if (!payload.customToken) throw new Error('Token missing.');
			await signInWithCustomToken(auth, payload.customToken);
			await impersonationStore.touch();
			untrack(() => {
				open = false;
				goto('/dashboard', { replaceState: true });
			});
		} catch (e) {
			console.error('Impersonation failed', e);
			alert('Impersonation failed: ' + (e instanceof Error ? e.message : String(e)));
		} finally {
			impersonating = '';
		}
	}


	// ── Keyboard Interception ───────────────────────────────────────────────
	$effect(() => {
		if (typeof window === 'undefined') return;
		const handleKey = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				e.preventDefault();
				open = !open;
			}
			if (e.key === 'Escape' && open) {
				open = false;
			}
		};
		window.addEventListener('keydown', handleKey);
		return () => window.removeEventListener('keydown', handleKey);
	});

	// Reset state when closed or focus when opened
	let inputEl = $state<HTMLInputElement | null>(null);
	$effect(() => {
		if (open) {
			if (browser) requestAnimationFrame(() => inputEl?.focus());
		} else {
			searchQuery = '';
			results = [];
			selectedIndex = 0;
		}
	});

	// ── Lazy-Load Hydration ──────────────────────────────────────────────────
	$effect(() => {
		const q = searchQuery.trim();
		if (!q) {
			results = [];
			return;
		}

		isSearching = true;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(async () => {
			try {
				// Query clubs by name prefix
				const clubsQ = query(
					collection(db, 'clubs'),
					orderBy('name'),
					startAt(q),
					endAt(q + '\uf8ff'),
					limit(5)
				);
				
				// Query users by email prefix
				const qLower = q.toLowerCase();
				const usersQ = query(
					collection(db, 'users'),
					orderBy('email'),
					startAt(qLower),
					endAt(qLower + '\uf8ff'),
					limit(5)
				);

				const [clubsSnap, usersSnap] = await Promise.all([
					getDocs(clubsQ),
					getDocs(usersQ)
				]);

				const newResults: any[] = [];
				clubsSnap.forEach(doc => {
					const data = doc.data();
					newResults.push({ type: 'club', id: doc.id, name: data.name || doc.id });
				});
				usersSnap.forEach(doc => {
					const data = doc.data();
					newResults.push({ type: 'user', id: doc.id, name: data.email || doc.id });
				});

				results = newResults;
				selectedIndex = 0;
			} catch (e) {
				console.error('[CommandPalette] Search failed', e);
			} finally {
				isSearching = false;
			}
		}, 300);
	});

	// ── Deep Dynamic Routing ─────────────────────────────────────────────────
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = (selectedIndex + 1) % Math.max(results.length, 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = (selectedIndex - 1 + Math.max(results.length, 1)) % Math.max(results.length, 1);
		} else if (e.key === 'Enter' && results.length > 0) {
			e.preventDefault();
			executeAction(results[selectedIndex]);
		}
	}

	function executeAction(item: any) {
		untrack(() => {
			if (item.type === 'club') {
				goto(`/admin/organizations/${item.id}`);
			} else if (item.type === 'user') {
				goto(`/admin/users/${item.id}`);
			}
			open = false;
		});
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- Z4 Floating Chrome: Heavy Liquid Glassmorphism backdrop -->
	<div 
		class="tw-fixed tw-inset-0 tw-z-50 tw-flex tw-items-start tw-justify-center tw-pt-[10vh] tw-bg-black/60 tw-backdrop-blur-[20px]" 
		onclick={() => open = false}
	>
		<!-- Container: solid deep slate background to preserve text contrast -->
		<div 
			class="tw-w-full tw-max-w-2xl tw-bg-[#0B0F19] tw-border tw-border-[#334155] tw-rounded-xl tw-shadow-2xl tw-overflow-hidden tw-flex tw-flex-col" 
			onclick={(e) => e.stopPropagation()}
		>
			<input 
				type="text" 
				class="tw-w-full tw-bg-transparent tw-border-b tw-border-[#334155] tw-px-4 tw-py-4 tw-text-lg tw-text-[#FAFAFA] tw-font-sans tw-outline-none placeholder:tw-text-[#A1A1AA]"
				placeholder="Search organizations or users..."
				bind:value={searchQuery}
				onkeydown={handleKeydown}
				bind:this={inputEl}
			/>
			
			{#if isSearching}
				<div class="tw-p-4 tw-text-[#A1A1AA] tw-font-mono tw-text-xs tw-tracking-widest">SEARCHING_DB...</div>
			{:else if results.length > 0}
				<div class="tw-flex tw-flex-col tw-bg-[#0B0F19]">
					{#each results as item, i}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<div 
							class="tw-flex tw-items-center tw-justify-between tw-px-4 tw-py-3 tw-cursor-pointer tw-border-b tw-border-[#334155] last:tw-border-0"
							class:tw-bg-[#1E293B]={i === selectedIndex}
							onclick={() => executeAction(item)}
						>
							
							<div class="tw-flex tw-flex-col">
								<!-- Name: Geist Sans -->
								<span class="tw-font-sans tw-text-sm tw-font-bold tw-text-[#FAFAFA]">{item.name}</span>
								<!-- ID: Geist Mono -->
								<span class="tw-font-mono tw-text-xs tw-tracking-widest tw-text-[#A1A1AA] tw-uppercase">{item.type} • {item.id}</span>
							</div>
							{#if item.type === 'user'}
								<button 
									type="button"
									class="tw-ml-4 tw-px-3 tw-py-1 tw-text-xs tw-font-bold tw-font-sans tw-rounded tw-bg-[#14b8a6]/10 tw-text-[#14b8a6] hover:tw-bg-[#14b8a6]/20 tw-transition-colors"
									disabled={impersonating === item.id}
									onclick={(e) => { e.stopPropagation(); doImpersonate(item); }}
								>
									{impersonating === item.id ? 'LOGIN...' : 'LOGIN AS'}
								</button>
							{/if}

						</div>
					{/each}
				</div>
			{:else if searchQuery.trim() !== ''}
				<div class="tw-p-4 tw-text-[#A1A1AA] tw-font-mono tw-text-xs tw-tracking-widest">NO_RESULTS_FOUND</div>
			{/if}
		</div>
	</div>
{/if}
