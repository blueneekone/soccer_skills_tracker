<script lang="ts">
	import { untrack } from 'svelte';
	import { browser } from '$app/environment';
	import { collection, doc, query, where, onSnapshot, writeBatch, serverTimestamp } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { dopamineExplosion } from '$lib/services/dopamine.svelte.js';
	import InboxZeroHero from '$lib/components/director/os/InboxZeroHero.svelte';

	let { clubId = '' } = $props();

	interface FailedPayment {
		id: string;
		playerName: string;
		parentEmail: string;
		amountCents: number;
		lastFailedAt: number;
		status: string;
	}

	let failedPayments = $state<FailedPayment[]>([]);
	let loading = $state(true);
	let isResolving = $state(false);
	let resolveError = $state('');

	$effect(() => {
		if (!browser || !clubId) return;
		loading = true;

		const q = query(
			collection(db, 'registrations'),
			where('clubId', '==', clubId),
			where('paymentStatus', '==', 'failed')
		);

		const unsub = onSnapshot(q, (snap) => {
			failedPayments = snap.docs.map((d) => {
				const data = d.data();
				return {
					id: d.id,
					playerName: data.playerName || 'Unknown Athlete',
					parentEmail: data.parentEmail || 'Unknown Parent',
					amountCents: typeof data.totalFeeCents === 'number' ? data.totalFeeCents : 0,
					lastFailedAt: data.updatedAt?.toMillis?.() ?? Date.now(),
					status: data.paymentStatus
				};
			});
			loading = false;
		});

		return () => unsub();
	});

	async function resolveBatch() {
		if (failedPayments.length === 0 || isResolving) return;
		isResolving = true;
		resolveError = '';

		try {
			const batch = writeBatch(db);
			const limitList = failedPayments.slice(0, 500);
			
			for (const fp of limitList) {
				const ref = doc(db, 'registrations', fp.id);
				batch.update(ref, {
					paymentStatus: 'paid',
					resolvedAt: serverTimestamp(),
					resolvedBy: 'director_recovery_override'
				});
			}

			await batch.commit();

			// 🏆 MASSIVE SATISFYING HIGH-FIVE FEEDBACK LOOP (Octalysis Core Drive 2) 🏆
			await dopamineExplosion('levelUp');
			await new Promise(r => setTimeout(r, 400));
			await dopamineExplosion('matchWin', { x: 0.3, y: 0.6 });
			await dopamineExplosion('loadoutUnlock', { x: 0.7, y: 0.6 });

		} catch (err: unknown) {
			resolveError = err instanceof Error ? err.message : 'Batch resolution failed.';
		} finally {
			isResolving = false;
		}
	}

	function formatCents(cents: number) {
		return `$${(cents / 100).toFixed(2)}`;
	}
</script>

<div class="prm-showcase vanguard-card">
	<div class="prm-header">
		<div class="prm-title-row">
			<Icon name="status.warning" size={24} class="prm-icon-warn" />
			<div>
				<h3 class="prm-title">PAYMENT RECOVERY SHOWCASE</h3>
				<p class="prm-subtitle">Empathetic Lapsed Payment Assistant</p>
			</div>
		</div>
		{#if failedPayments.length > 0}
			<button
				class="prm-btn-resolve"
				disabled={isResolving}
				onclick={() => void resolveBatch()}
			>
				{isResolving ? 'RESOLVING...' : 'RESOLVE ALL FAILED (HIGH-FIVE)'}
			</button>
		{/if}
	</div>

	{#if loading}
		<div class="prm-loading">
			<span class="prm-spin"></span>
			<span>Scanning for lapsed payments...</span>
		</div>
	{:else if resolveError}
		<div class="prm-error">{resolveError}</div>
	{:else if failedPayments.length === 0}
		<InboxZeroHero 
			title="ALL PAYMENTS HEALTHY" 
			subtitle="You have zero lapsed payments to chase down. Breathe easy." 
		/>
	{:else}
		<div class="prm-list">
			<div class="prm-grid-header">
				<span>ATHLETE</span>
				<span>GUARDIAN</span>
				<span>AMOUNT</span>
				<span>STATUS</span>
			</div>
			{#each failedPayments as fp (fp.id)}
				<div class="prm-row">
					<span class="prm-cell-primary">{fp.playerName}</span>
					<span class="prm-cell-secondary">{fp.parentEmail}</span>
					<span class="prm-cell-amount">{formatCents(fp.amountCents)}</span>
					<span class="prm-cell-status">FAILED STRIPE CARD</span>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.prm-showcase {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding: 1.5rem;
		background: linear-gradient(135deg, rgba(8, 17, 28, 0.78), rgba(2, 6, 12, 0.92));
		backdrop-filter: blur(var(--vanguard-blur, 24px));
		border: 1px solid rgba(251, 191, 36, 0.2);
		border-radius: 12px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
	}

	.prm-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.prm-title-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	:global(.prm-icon-warn) {
		color: #fbbf24;
	}

	.prm-title {
		margin: 0;
		font-family: 'Geist Mono', monospace;
		font-size: 0.85rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		color: #fbbf24;
	}

	.prm-subtitle {
		margin: 0.25rem 0 0;
		font-family: 'Switzer', sans-serif;
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.prm-btn-resolve {
		background: linear-gradient(135deg, #10b981, #059669);
		color: #022c22;
		border: none;
		border-radius: 999px;
		padding: 0.5rem 1.25rem;
		font-family: 'Geist Mono', monospace;
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.05em;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
	}

	.prm-btn-resolve:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
		filter: brightness(1.1);
	}

	.prm-btn-resolve:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.prm-loading {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-family: 'Geist Mono', monospace;
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.5);
		padding: 2rem;
		justify-content: center;
	}

	.prm-spin {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(251, 191, 36, 0.2);
		border-top-color: #fbbf24;
		border-radius: 50%;
		animation: prmSpin 0.8s linear infinite;
	}

	@keyframes prmSpin {
		to { transform: rotate(360deg); }
	}


	.prm-error {
		padding: 1rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 8px;
		color: #fca5a5;
		font-family: 'Geist Mono', monospace;
		font-size: 0.8rem;
	}

	.prm-list {
		display: flex;
		flex-direction: column;
	}

	.prm-grid-header {
		display: grid;
		grid-template-columns: 2fr 3fr 1.5fr 2fr;
		gap: 1rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		font-family: 'Geist Mono', monospace;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		color: rgba(255, 255, 255, 0.4);
	}

	.prm-row {
		display: grid;
		grid-template-columns: 2fr 3fr 1.5fr 2fr;
		gap: 1rem;
		align-items: center;
		padding: 1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		transition: background 0.2s ease;
	}

	.prm-row:hover {
		background: rgba(255, 255, 255, 0.02);
	}

	.prm-cell-primary {
		font-family: 'Switzer', sans-serif;
		font-size: 0.9rem;
		font-weight: 600;
		color: #f8fafc;
	}

	.prm-cell-secondary {
		font-family: 'Geist Mono', monospace;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.prm-cell-amount {
		font-family: 'Geist Mono', monospace;
		font-size: 0.85rem;
		font-weight: 700;
		color: #f8fafc;
	}

	.prm-cell-status {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.25rem 0.5rem;
		border: 1px solid rgba(239, 68, 68, 0.3);
		background: rgba(239, 68, 68, 0.1);
		border-radius: 4px;
		font-family: 'Geist Mono', monospace;
		font-size: 0.65rem;
		font-weight: 700;
		color: #fca5a5;
		letter-spacing: 0.05em;
	}
</style>
