<script>
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import {
		collection,
		query,
		where,
		getDocs,
		doc,
		updateDoc,
		serverTimestamp,
	} from 'firebase/firestore';

	// ── Role Gate ─────────────────────────────────────────────────────────────
	const isAuthorized = $derived(authStore.isDirector || authStore.isAdmin);

	// ── State ─────────────────────────────────────────────────────────────────
	let pendingNodes = $state([]);
	let selectedNodeId = $state(null);
	let isClearing = $state(false);
	let clearSuccess = $state(false);
	let clearError = $state('');
	let confirmPending = $state(false);
	let isLoadingNodes = $state(false);

	// ── Derived ───────────────────────────────────────────────────────────────
	const selectedNode = $derived(
		pendingNodes.find((n) => n.id === selectedNodeId) ?? null,
	);

	// ── Data Loading ──────────────────────────────────────────────────────────
	$effect(() => {
		if (!isAuthorized) return;
		const tenantId = authStore.tenantId;
		if (!tenantId) return;

		let cancelled = false;

		async function loadNodes() {
			isLoadingNodes = true;
			try {
				const usersRef = collection(db, 'users');
				const q = query(
					usersRef,
					where('clubId', '==', tenantId),
					where('status', 'in', ['pending', 'pending_clearance']),
				);
				const snap = await getDocs(q);
				if (!cancelled) {
					pendingNodes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
				}
			} catch (err) {
				if (!cancelled) {
					clearError = err?.message ?? 'Query failed';
				}
			} finally {
				if (!cancelled) isLoadingNodes = false;
			}
		}

		loadNodes();
		return () => {
			cancelled = true;
		};
	});

	// ── Force-Clear Handler ───────────────────────────────────────────────────
	async function handleForceClear(nodeId) {
		if (!confirmPending) {
			confirmPending = true;
			return;
		}

		isClearing = true;
		clearError = '';

		try {
			const nodeRef = doc(db, 'users', nodeId);
			await updateDoc(nodeRef, {
				status: 'cleared',
				attestedVia: 'manual_director_override',
				overrideTimestamp: serverTimestamp(),
				overrideUid: authStore.user?.uid ?? 'unknown',
				schemaVersion: 1,
			});

			pendingNodes = pendingNodes.filter((n) => n.id !== nodeId);
			clearSuccess = true;
			confirmPending = false;
			selectedNodeId = null;

			setTimeout(() => {
				clearSuccess = false;
			}, 3000);
		} catch (err) {
			clearError = err?.message ?? 'Unknown override failure';
		} finally {
			isClearing = false;
		}
	}

	function cancelConfirm() {
		confirmPending = false;
	}

	function selectNode(nodeId) {
		if (selectedNodeId === nodeId) {
			selectedNodeId = null;
			confirmPending = false;
		} else {
			selectedNodeId = nodeId;
			confirmPending = false;
		}
	}
</script>

{#if !isAuthorized}
	<!-- ── ACCESS DENIED ──────────────────────────────────────────────────── -->
	<div
		class="tw-flex tw-items-center tw-justify-center tw-min-h-[120px] tw-p-6
		       tw-backdrop-blur-[40px] tw-bg-[#040f16]/85 tw-border tw-border-[#ff0055]/30
		       tw-rounded-xl tw-mx-auto tw-max-w-md"
	>
		<div class="tw-text-center">
			<p
				class="tw-font-mono tw-text-[11px] tw-tracking-widest tw-text-[#ff0055]
				       tw-uppercase tw-font-bold"
			>
				⛔ ACCESS DENIED — DIRECTOR CLEARANCE REQUIRED
			</p>
			<p class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-white/30 tw-mt-2">
				FAILSAFE TERMINAL RESTRICTED TO DIRECTOR / SUPER-ADMIN
			</p>
		</div>
	</div>
{:else}
	<!-- ── AUTHORIZED TERMINAL ───────────────────────────────────────────── -->
	<div
		class="tw-w-full tw-max-w-2xl tw-mx-auto tw-space-y-4
		       tw-backdrop-blur-[40px] tw-bg-[#040f16]/85 tw-border tw-border-[#00f0ff]/20
		       tw-rounded-xl tw-p-6 tw-relative tw-overflow-hidden"
	>
		<!-- Ambient glow -->
		<div
			class="tw-absolute tw-top-0 tw-left-0 tw-right-0 tw-h-px
			       tw-bg-gradient-to-r tw-from-transparent tw-via-[#00f0ff]/40 tw-to-transparent"
		></div>

		<!-- ── HEADER ──────────────────────────────────────────────────────── -->
		<div class="tw-space-y-2">
			<p
				class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#00f0ff]
				       tw-uppercase tw-font-bold"
			>
				// FAILSAFE OVERRIDE TERMINAL
			</p>
			<p class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-white/40 tw-uppercase">
				[ ALPHA EXCEPTION HANDLING — DIRECTOR CLEARANCE ACTIVE ]
			</p>

			<!-- Caution strip -->
			<div
				class="tw-w-full tw-bg-[#ff0055]/10 tw-border-t tw-border-b
				       tw-border-[#ff0055]/20 tw-py-1.5 tw-px-3 tw-rounded"
			>
				<p class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#ff0055] tw-uppercase">
					⚠ IMMUTABLE AUDIT TRAIL ACTIVE
				</p>
			</div>
		</div>

		<!-- ── FLASH STATES ─────────────────────────────────────────────────── -->
		{#if clearSuccess}
			<div
				class="tw-bg-[#00ff88]/10 tw-border tw-border-[#00ff88]/30 tw-rounded-lg
				       tw-px-4 tw-py-3"
			>
				<p class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#00ff88] tw-uppercase">
					✓ NODE CLEARED — IMMUTABLE RECORD WRITTEN
				</p>
			</div>
		{/if}

		{#if clearError}
			<div
				class="tw-bg-[#ff0055]/10 tw-border tw-border-[#ff0055]/30 tw-rounded-lg
				       tw-px-4 tw-py-3"
			>
				<p class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#ff0055] tw-uppercase">
					⚠ OVERRIDE FAILED: {clearError}
				</p>
			</div>
		{/if}

		<!-- ── PENDING NODE LIST ─────────────────────────────────────────────── -->
		<div class="tw-space-y-2">
			<p class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-white/30 tw-uppercase">
				PENDING ESCROW NODES
			</p>

			{#if isLoadingNodes}
				<div class="tw-flex tw-items-center tw-gap-2 tw-py-4">
					<span
						class="tw-inline-block tw-w-1.5 tw-h-1.5 tw-rounded-full tw-bg-[#00f0ff]
						       tw-animate-pulse"
					></span>
					<p
						class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#00f0ff]/70
						       tw-uppercase tw-animate-pulse"
					>
						SCANNING PENDING NODES...
					</p>
				</div>
			{:else if pendingNodes.length === 0}
				<div
					class="tw-bg-[#00ff88]/5 tw-border tw-border-[#00ff88]/20 tw-rounded-lg
					       tw-px-4 tw-py-3"
				>
					<p
						class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#00ff88]/80
						       tw-uppercase"
					>
						ALL NODES CLEARED — NO PENDING ESCROW
					</p>
				</div>
			{:else}
				<div class="tw-space-y-1.5">
					{#each pendingNodes as node (node.id)}
						<button
							onclick={() => selectNode(node.id)}
							class="tw-w-full tw-flex tw-items-center tw-justify-between
							       tw-px-4 tw-py-3 tw-rounded-lg tw-transition-all tw-duration-200
							       tw-bg-[#020202]/60 tw-border tw-text-left
							       {selectedNodeId === node.id
								? 'tw-border-[#00f0ff]/60 tw-shadow-[0_0_12px_rgba(0,240,255,0.15)]'
								: 'tw-border-[#00f0ff]/10 hover:tw-border-[#00f0ff]/30'}"
						>
							<div class="tw-space-y-0.5">
								<p class="tw-font-mono tw-text-[10px] tw-tracking-wider tw-text-white/80">
									{node.email ?? node.id}
								</p>
								<p class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-white/30">
									UID: {node.id.slice(0, 12)}…
								</p>
							</div>

							<div class="tw-flex tw-items-center tw-gap-3">
								<!-- Status badge -->
								<span
									class="tw-px-2 tw-py-0.5 tw-rounded tw-bg-[#ff0055]/15
									       tw-border tw-border-[#ff0055]/30
									       tw-font-mono tw-text-[8px] tw-tracking-widest tw-text-[#ff0055]
									       tw-uppercase"
								>
									{node.status}
								</span>

								<!-- Select indicator -->
								<span
									class="tw-font-mono tw-text-[8px] tw-tracking-widest tw-uppercase
									       {selectedNodeId === node.id
										? 'tw-text-[#00f0ff]'
										: 'tw-text-white/30'}"
								>
									{selectedNodeId === node.id ? '[ SELECTED ]' : '[ SELECT ]'}
								</span>
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- ── ACTION BLOCK ──────────────────────────────────────────────────── -->
		{#if selectedNode}
			<div
				class="tw-space-y-4 tw-pt-4 tw-border-t tw-border-[#00f0ff]/10"
			>
				<!-- Selected node info -->
				<div>
					<p class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-white/30 tw-uppercase tw-mb-1">
						SELECTED NODE
					</p>
					<p class="tw-font-mono tw-text-[12px] tw-tracking-wider tw-text-white/90 tw-font-semibold">
						{selectedNode.email ?? selectedNode.id}
					</p>
					<p class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-mt-0.5">
						<span class="tw-text-white/30">STATUS: </span>
						<span class="tw-text-[#ff0055]">{selectedNode.status}</span>
					</p>
				</div>

				<!-- Telemetry preview -->
				<div
					class="tw-bg-[#020202] tw-border tw-border-[#00f0ff]/10 tw-rounded-lg
					       tw-px-4 tw-py-3"
				>
					<p
						class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-white/30
						       tw-uppercase tw-mb-2"
					>
						INJECTED TELEMETRY PREVIEW
					</p>
					<div class="tw-space-y-0.5">
						<p class="tw-font-mono tw-text-[9px] tw-tracking-wide tw-text-[#00f0ff]/70">
							attestedVia: <span class="tw-text-white/60">'manual_director_override'</span>
						</p>
						<p class="tw-font-mono tw-text-[9px] tw-tracking-wide tw-text-[#00f0ff]/70">
							overrideUid: <span class="tw-text-white/60">{authStore.user?.uid ?? 'unknown'}</span>
						</p>
						<p class="tw-font-mono tw-text-[9px] tw-tracking-wide tw-text-[#00f0ff]/70">
							overrideTimestamp: <span class="tw-text-white/60">[NOW]</span>
						</p>
					</div>
				</div>

				<!-- CTA Buttons -->
				{#if !confirmPending}
					<button
						onclick={() => handleForceClear(selectedNodeId)}
						disabled={isClearing}
						class="tw-w-full tw-py-3 tw-rounded-lg tw-font-mono tw-text-[10px]
						       tw-tracking-widest tw-uppercase tw-font-bold tw-transition-all
						       tw-duration-200 tw-bg-[#020202]/80
						       tw-border tw-border-[#ff0055]/60 tw-text-[#ff0055]
						       hover:tw-border-[#ff0055] hover:tw-shadow-[0_0_16px_rgba(255,0,85,0.25)]
						       hover:tw-bg-[#ff0055]/10
						       disabled:tw-opacity-40 disabled:tw-cursor-not-allowed"
					>
						[ FORCE PHYSICAL ESCROW CLEARANCE ]
					</button>
				{:else}
					<div class="tw-space-y-2">
						<button
							onclick={() => handleForceClear(selectedNodeId)}
							disabled={isClearing}
							class="tw-w-full tw-py-3 tw-rounded-lg tw-font-mono tw-text-[10px]
							       tw-tracking-widest tw-uppercase tw-font-bold tw-transition-all
							       tw-duration-200 tw-bg-[#ff0055]/10
							       tw-border-2 tw-border-[#ff0055] tw-text-[#ff0055]
							       tw-animate-pulse
							       disabled:tw-opacity-40 disabled:tw-cursor-not-allowed"
						>
							{isClearing ? '[ WRITING OVERRIDE... ]' : '[ ⚠ CONFIRM: WRITE IMMUTABLE OVERRIDE ]'}
						</button>

						<button
							onclick={cancelConfirm}
							disabled={isClearing}
							class="tw-w-full tw-py-2 tw-font-mono tw-text-[9px] tw-tracking-widest
							       tw-text-white/30 tw-uppercase hover:tw-text-white/60
							       tw-transition-colors tw-duration-150
							       disabled:tw-opacity-40 disabled:tw-cursor-not-allowed"
						>
							[ CANCEL — STAND DOWN ]
						</button>
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}
