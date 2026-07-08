<script lang="ts">
	import { getFunctions, httpsCallable } from 'firebase/functions';
	import { app } from '$lib/firebase.js';
	import { onMount } from 'svelte';
	import Sortable from 'sortablejs';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import Swal from 'sweetalert2';

	// ==========================================
	// TACTICAL FORGE (RAG AI) STATE
	// ==========================================
	let prompt = $state('');
	let messages = $state<{ role: 'user' | 'ai'; content: string }[]>([]);
	let isGenerating = $state(false);

	async function submitPrompt() {
		if (!prompt.trim()) return;
		messages = [...messages, { role: 'user', content: prompt }];
		const currentPrompt = prompt;
		prompt = '';
		isGenerating = true;

		try {
			const functions = getFunctions(app);
			const generateTacticalPlan = httpsCallable(functions, 'generateTacticalPlan');
			const result = await generateTacticalPlan({ prompt: currentPrompt });
			const data = result.data as { plan: string };
			messages = [...messages, { role: 'ai', content: data.plan }];
		} catch (error) {
			console.error('Failed to generate tactical plan:', error);
			messages = [...messages, { role: 'ai', content: '[ERROR]: Neural link severed. Please try again.' }];
		} finally {
			isGenerating = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			submitPrompt();
		}
	}

	// ==========================================
	// CURRICULUM BUILDER (DRAG & DROP) STATE
	// ==========================================
	let activeTab = $state<'ai' | 'builder'>('builder');
	
	let drillLibrary = $state([
		{ id: 'lib-1', title: 'RONDO 4v2' },
		{ id: 'lib-2', title: 'TRANSITION 7v7' },
		{ id: 'lib-3', title: 'FINISHING 1v1' },
		{ id: 'lib-4', title: 'DEFENSIVE SHIFT' },
		{ id: 'lib-5', title: 'AEROBIC FITNESS' }
	]);

	let microcycles = $state([
		{ id: 'mc-1', title: 'WEEK 1: HIGH PRESS', drills: [] as typeof drillLibrary },
		{ id: 'mc-2', title: 'WEEK 2: BUILD UP', drills: [] as typeof drillLibrary },
		{ id: 'mc-3', title: 'WEEK 3: LOW BLOCK', drills: [] as typeof drillLibrary }
	]);

	let isCommitting = $state(false);

	// Proactive AI Warning state
	let showAlert = $state(true);

	/**
	 * Svelte 5 Action for SortableJS
	 */
	function sortableList(node: HTMLElement, options: any) {
		const sortable = Sortable.create(node, {
			...options,
			animation: 150,
			ghostClass: 'sortable-ghost',
			dragClass: 'sortable-drag'
		});
		return {
			destroy() {
				sortable.destroy();
			}
		};
	}

	async function commitMacrocycle() {
		isCommitting = true;
		try {
			const functions = getFunctions(app);
			const commit = httpsCallable(functions, 'commitMacrocycle');
			await commit({ payload: { microcycles } });
			
			Swal.fire({
				icon: 'success',
				title: 'MACROCYCLE COMMITTED',
				text: 'Curriculum secured to team_assignments',
				toast: true,
				position: 'bottom-end',
				showConfirmButton: false,
				timer: 1500,
				background: '#0f172a',
				color: '#14b8a6'
			});
		} catch (error) {
			console.error('Commit failed:', error);
			Swal.fire({
				icon: 'error',
				title: 'COMMIT REJECTED',
				text: 'Missing isCleared JWT claim or network error.',
				background: '#0f172a',
				color: '#ef4444'
			});
		} finally {
			isCommitting = false;
		}
	}
</script>

<div class="tw-min-h-screen tw-bg-[#020617] tw-p-8 tw-font-sans tw-text-[#f8fafc]">
	<div class="tw-max-w-6xl tw-mx-auto tw-flex tw-flex-col tw-gap-8">
		
		<header class="tw-flex tw-flex-col tw-gap-2">
			<h1 class="tw-font-mono tw-text-2xl tw-text-[#f8fafc] tw-uppercase tw-tracking-widest tw-m-0">Coach OS: Tactical Forge</h1>
			<p class="tw-font-mono tw-text-sm tw-text-[#14b8a6] tw-m-0">Curriculum Builder & AI Systems</p>
		</header>

		<div class="tw-flex tw-items-center tw-border-b tw-border-[#334155]">
			<button 
				class="tw-px-6 tw-py-3 tw-font-mono tw-text-sm tw-font-bold tw-uppercase tw-tracking-widest tw-transition-colors {activeTab === 'builder' ? 'tw-border-b-2 tw-border-[#14b8a6] tw-text-[#14b8a6]' : 'tw-text-[#64748b] hover:tw-text-[#f8fafc]'}"
				onclick={() => activeTab = 'builder'}
			>
				Curriculum Builder
			</button>
			<button 
				class="tw-px-6 tw-py-3 tw-font-mono tw-text-sm tw-font-bold tw-uppercase tw-tracking-widest tw-transition-colors {activeTab === 'ai' ? 'tw-border-b-2 tw-border-[#14b8a6] tw-text-[#14b8a6]' : 'tw-text-[#64748b] hover:tw-text-[#f8fafc]'}"
				onclick={() => activeTab = 'ai'}
			>
				RAG Terminal
			</button>
		</div>

		{#if activeTab === 'builder'}
			<!-- PROACTIVE AI WARNING -->
			{#if showAlert}
				<div class="tw-bg-[#0f172a] tw-border tw-border-[#f59e0b] tw-p-4 tw-flex tw-items-start tw-gap-4 tw-transition-all tw-duration-200">
					<Icon name={"status.pulse" as IconName} size={24} class="tw-text-[#f59e0b] tw-shrink-0" />
					<div class="tw-flex-1">
						<div class="tw-font-mono tw-text-xs tw-text-[#f59e0b] tw-font-bold tw-mb-1">RL ADAPTIVE ENGINE // BIOMETRIC WARNING</div>
						<div class="tw-font-mono tw-text-sm tw-text-[#f8fafc]">Player X's heart rate variability suggests a 15% reduction in drill intensity today. We recommend replacing AEROBIC FITNESS with a lower-load phase play.</div>
					</div>
					<button onclick={() => showAlert = false} class="tw-text-[#64748b] hover:tw-text-[#f8fafc] tw-transition-colors">
						<Icon name={"nav.close" as IconName} size={20} />
					</button>
				</div>
			{/if}

			<!-- TACTILE CURRICULUM BUILDER -->
			<div class="tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-6 tw-items-start">
				
				<!-- Library -->
				<div class="lg:tw-col-span-3 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-flex tw-flex-col">
					<div class="tw-bg-[#020617] tw-border-b tw-border-[#334155] tw-p-3 tw-font-mono tw-text-xs tw-text-[#94a3b8] tw-uppercase tw-tracking-widest">
						Drill Library
					</div>
					<div 
						class="tw-p-4 tw-flex tw-flex-col tw-gap-2 tw-min-h-[200px]"
						use:sortableList={{ group: { name: 'drills', pull: 'clone', put: false }, sort: false }}
					>
						{#each drillLibrary as drill (drill.id)}
							<div class="tw-bg-[#020617] tw-border tw-border-[#1e293b] tw-p-3 tw-font-mono tw-text-xs tw-text-[#e2e8f0] tw-cursor-move hover:tw-border-[#14b8a6] tw-transition-colors tw-duration-150">
								{drill.title}
							</div>
						{/each}
					</div>
				</div>

				<!-- Macrocycle Grid -->
				<div class="lg:tw-col-span-9 tw-flex tw-flex-col tw-gap-6">
					<div 
						class="tw-grid tw-gap-4" 
						style="grid-template-columns: repeat(auto-fit, minmax(clamp(200px, 25vw, 400px), 1fr));"
					>
						{#each microcycles as mc (mc.id)}
							<div class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-flex tw-flex-col">
								<div class="tw-bg-[#020617] tw-border-b tw-border-[#334155] tw-p-3 tw-flex tw-items-center tw-justify-between">
									<span class="tw-font-mono tw-text-xs tw-text-[#14b8a6] tw-uppercase tw-tracking-widest">{mc.title}</span>
								</div>
								<div 
									class="tw-p-4 tw-flex tw-flex-col tw-gap-2 tw-min-h-[150px]"
									use:sortableList={{ group: 'drills' }}
								>
									<!-- Drills dropped here -->
								</div>
							</div>
						{/each}
					</div>

					<div class="tw-flex tw-justify-end">
						<button 
							class="tw-bg-[#14b8a6] hover:tw-bg-[#0d9488] tw-text-[#020617] tw-font-mono tw-text-sm tw-font-bold tw-uppercase tw-tracking-widest tw-px-8 tw-py-3 tw-transition-colors tw-duration-150 disabled:tw-opacity-50"
							onclick={commitMacrocycle}
							disabled={isCommitting}
						>
							{isCommitting ? 'COMMITTING...' : 'COMMIT MACROCYCLE'}
						</button>
					</div>
				</div>
			</div>
		{/if}

		{#if activeTab === 'ai'}
			<div class="terminal-window">
				<div class="terminal-history">
					{#if messages.length === 0}
						<div class="terminal-empty">
							> System ready. Awaiting tactical parameters...
						</div>
					{/if}
					{#each messages as msg}
						<div class="message message--{msg.role}">
							<span class="message-prefix">{msg.role === 'user' ? '> CMD:' : '> AI_SYS:'}</span>
							<div class="message-content">{msg.content}</div>
						</div>
					{/each}
					{#if isGenerating}
						<div class="message message--ai loading">
							<span class="message-prefix">> AI_SYS:</span>
							<span class="cursor">_</span> Synthesizing tactical vectors...
						</div>
					{/if}
				</div>
				<div class="terminal-input-area">
					<span class="input-prefix">></span>
					<textarea class="terminal-input" bind:value={prompt} onkeydown={handleKeydown} placeholder="E.g., Generate a 60-minute high-pressing session for U14s..." rows="2" disabled={isGenerating}></textarea>
					<button class="btn-execute" onclick={submitPrompt} disabled={isGenerating || !prompt.trim()}>
						EXECUTE
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	/* Sortable JS active classes */
	:global(.sortable-ghost) {
		opacity: 0.4;
		border: 1px dashed #14b8a6 !important;
	}
	:global(.sortable-drag) {
		cursor: grabbing !important;
		box-shadow: 0 10px 25px rgba(0,0,0,0.5);
	}

	/* Terminal Styles from previous sprint */
	.terminal-window {
		background: rgba(15, 23, 42, 0.8);
		border: 1px solid #334155;
		display: flex;
		flex-direction: column;
		height: 600px;
	}
	.terminal-history {
		flex: 1;
		padding: 24px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.terminal-empty {
		font-family: var(--font-mono, 'Geist Mono', monospace);
		color: #64748b;
		font-size: 0.875rem;
	}
	.message {
		display: flex;
		gap: 12px;
		font-family: var(--font-mono, 'Geist Mono', monospace);
		font-size: 0.875rem;
		line-height: 1.5;
	}
	.message--user { color: #94a3b8; }
	.message--ai { color: #f8fafc; }
	.message-prefix { color: #f59e0b; white-space: nowrap; }
	.message-content { white-space: pre-wrap; }
	.loading { color: #14b8a6; }
	.cursor { animation: blink 1s step-end infinite; }
	@keyframes blink { 50% { opacity: 0; } }
	
	.terminal-input-area {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 16px;
		background: #0f172a;
		border-top: 1px solid #334155;
	}
	.input-prefix {
		font-family: var(--font-mono, 'Geist Mono', monospace);
		color: #14b8a6;
		margin-top: 8px;
	}
	.terminal-input {
		flex: 1;
		background: transparent;
		border: none;
		color: #f8fafc;
		font-family: var(--font-mono, 'Geist Mono', monospace);
		font-size: 0.875rem;
		resize: none;
		outline: none;
		line-height: 1.5;
		padding: 8px 0;
	}
	.terminal-input::placeholder { color: #475569; }
	.btn-execute {
		background: #14b8a6;
		color: #020617;
		font-family: var(--font-mono, 'Geist Mono', monospace);
		font-weight: 700;
		border: none;
		padding: 8px 16px;
		cursor: pointer;
		text-transform: uppercase;
		margin-top: 4px;
	}
	.btn-execute:disabled {
		background: #334155;
		color: #94a3b8;
		cursor: not-allowed;
	}
</style>
