<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
	import Swal from 'sweetalert2';
	import CoachTacticalPreviewStage from './CoachTacticalPreviewStage.svelte';
	import { designerTypeToAttributeId } from '$lib/coach/teamDrillLibrary.js';

	interface WarRoomTacticItem {
		id: string;
		name: string;
		updatedAt?: any;
		entities: any[];
		routes: any[];
	}

	interface Props {
		teamId: string;
		onDrillSaved?: () => void;
		onDeployToIntent?: (drillData: any) => void;
	}

	let {
		teamId = '',
		onDrillSaved = () => {},
		onDeployToIntent = () => {},
	}: Props = $props();

	// ── Tactical Plays loaded from War Room ──────────────────────────────────────
	let tactics = $state<WarRoomTacticItem[]>([]);
	let selectedTacticId = $state<string>('');
	let loadingTactics = $state(false);

	// ── Drill Blueprint Form State ──────────────────────────────────────────────
	let drillTitle = $state('Third-Man Overlap & Quick Finish');
	let focusArea = $state('gameday'); // 'ball_mastery' | 'gameday' | 'cardio' | 'core' | 'foundation'
	let ageGroup = $state('U12-U14');
	let playerCount = $state('8-12 Players');
	let durationMinutes = $state(15);
	let intensity = $state('High - 8.5/10');
	let gridDimensions = $state('40 x 30 Yards');
	let equipment = $state('8 Cones, 12 Balls, 4 Agility Poles, 2 Mini Goals, 12 Pinnies');
	let setupDescription = $state('Position two target neutrals at the midfield line. Four attackers combine through central pivot before releasing wide runner for a first-time cross.');
	let coachingPoints = $state('• Trigger diagonal run on back-lift of the passer.\n• Check shoulder and scan opposite flank before receiving.\n• Firm 1-touch or 2-touch tempo to exploit transitional half-spaces.');
	let commonMistakes = $state('• Runner leaves too early and gets caught offside.\n• Flat pass without penetrating line-breaking pace.');
	let isSaving = $state(false);

	// ── B815 Hydration & Load War Room Tactics ───────────────────────────────────
	$effect(() => {
		if (!browser || !teamId || !db || !authStore.isAuthenticated) {
			tactics = [];
			return;
		}

		loadingTactics = true;
		let cancelled = false;

		(async () => {
			try {
				const snap = await getDocs(collection(db, 'teams', teamId, 'tactics'));
				if (cancelled) return;

				const list: WarRoomTacticItem[] = [];
				snap.forEach((docSnap) => {
					const data = docSnap.data() || {};
					const c = data.cartridge || (data.canvasState ? JSON.parse(data.canvasState) : null);
					if (c) {
						list.push({
							id: docSnap.id,
							name: data.name || (docSnap.id.startsWith('wr_') ? 'Active War Room Board' : `Tactical Play ${docSnap.id.slice(0, 8)}`),
							updatedAt: data.updatedAt,
							entities: Array.isArray(c.entities) ? c.entities : [],
							routes: Array.isArray(c.routes) ? c.routes : [],
						});
					}
				});

				// Sort: active board first, then by recency
				list.sort((a, b) => {
					if (a.id.startsWith('wr_')) return -1;
					if (b.id.startsWith('wr_')) return 1;
					return (b.name || '').localeCompare(a.name || '');
				});

				tactics = list;
				if (list.length > 0) {
					const urlTacticId = browser ? page.url.searchParams.get('tacticId') : null;
					const match = urlTacticId ? list.find((t) => t.id === urlTacticId) : null;
					if (match) {
						selectedTacticId = match.id;
						if (match.name) {
							drillTitle = match.name;
						}
					} else if (!selectedTacticId) {
						selectedTacticId = list[0].id;
					}
				}
				loadingTactics = false;
			} catch (err) {
				console.error('[CoachDrillDesignerStudio] load tactics error:', err);
				if (!cancelled) loadingTactics = false;
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	const activeTactic = $derived(
		tactics.find((t) => t.id === selectedTacticId) || tactics[0] || null
	);

	function openWarRoom() {
		untrack(() => {
			goto('/coach/tactical');
		});
	}

	function printDrillCard() {
		if (typeof window !== 'undefined') {
			window.print();
		}
	}

	async function saveDrill(toIntent = false) {
		if (!drillTitle.trim()) {
			alert('Please enter a drill title.');
			return;
		}
		if (!teamId) {
			alert('Please select a team.');
			return;
		}
		if (!authStore.user?.uid) {
			alert('Please sign in to save drills.');
			return;
		}

		isSaving = true;
		const attributeId = designerTypeToAttributeId(focusArea);
		const focusLabel =
			focusArea === 'ball_mastery' ? 'Ball Mastery'
			: focusArea === 'cardio' ? 'Conditioning'
			: focusArea === 'core' ? 'Physical'
			: focusArea === 'gameday' ? 'Tactics'
			: 'Technical';

		const payload = {
			name: drillTitle.trim(),
			title: drillTitle.trim(),
			focusArea: focusLabel,
			category: focusLabel,
			attributeId,
			metricType: 'reps',
			description: setupDescription.trim() || `${focusLabel} tactical drill`,
			durationMinutes: Math.max(1, Math.min(120, Number(durationMinutes) || 15)),
			ageGroup,
			playerCount,
			intensity,
			gridDimensions,
			equipment,
			coachingPoints: coachingPoints.trim(),
			commonMistakes: commonMistakes.trim(),
			warRoomTacticId: activeTactic?.id || null,
			warRoomTacticName: activeTactic?.name || null,
			tacticEntitiesCount: activeTactic?.entities?.length || 0,
			tacticRoutesCount: activeTactic?.routes?.length || 0,
			// Persist full tactic canvas so War Room can load the drill back onto the pitch
			entities: activeTactic?.entities || [],
			routes: activeTactic?.routes || [],
			scope: 'team',
			createdBy: authStore.user.uid,
			createdAt: serverTimestamp(),
		};

		try {
			const docRef = await addDoc(collection(db, 'teams', teamId, 'drills'), payload);
			isSaving = false;

			if (toIntent) {
				onDeployToIntent({ id: docRef.id, ...payload });
			} else {
				await Swal.fire({
					title: 'Tactical Drill Saved',
					text: 'Your drill has been persisted to the Team Playbook and is ready for Intent Engine deployment.',
					icon: 'success',
					confirmButtonColor: '#0f172a',
				});
				onDrillSaved();
			}
		} catch (err) {
			isSaving = false;
			alert('Failed to save drill: ' + (err instanceof Error ? err.message : String(err)));
		}
	}
</script>

<div class="tw-flex tw-flex-col tw-gap-6 tw-w-full tw-text-slate-200">
	<!-- Top Bar: Tactical Selection & Status (Matching Intent Engine & Library) -->
	<div class="tw-bg-[#080d1a]/60 tw-backdrop-blur-md tw-border tw-border-slate-800/80 tw-rounded-2xl tw-p-6 tw-flex tw-flex-col md:tw-flex-row md:tw-items-center tw-justify-between tw-gap-5 tw-shadow-2xl">
		<div class="tw-flex tw-items-center tw-gap-4">
			<div class="tw-h-12 tw-w-12 tw-rounded-xl tw-bg-slate-800/60 tw-border tw-border-slate-700/80 tw-flex tw-items-center tw-justify-center tw-text-slate-200 tw-font-mono tw-font-bold tw-text-xl tw-shadow-inner">
				📐
			</div>
			<div>
				<h2 class="tw-text-slate-100 tw-font-bold tw-text-lg tw-flex tw-items-center tw-gap-3">
					<span>Tactical Drill Designer Studio</span>
					<span class="tw-bg-slate-800 tw-text-slate-300 tw-border tw-border-slate-700 tw-font-mono tw-text-[10px] tw-px-2.5 tw-py-1 tw-rounded-md tw-tracking-widest tw-uppercase">
						WAR ROOM INTEGRATED
					</span>
				</h2>
				<p class="tw-text-sm tw-text-slate-400 tw-mt-1">
					Select a play drawn in the War Room to build a structured, printable physical drill sheet.
				</p>
			</div>
		</div>

		<!-- War Room Tactic Picker -->
		<div class="tw-flex tw-items-center tw-gap-3 tw-bg-[#030712]/50 tw-p-2 tw-rounded-xl tw-border tw-border-slate-800/60">
			<span class="tw-font-mono tw-text-xs tw-text-slate-500 tw-uppercase tw-tracking-wider tw-pl-2">War Room Play:</span>
			{#if loadingTactics}
				<span class="tw-font-mono tw-text-xs tw-text-slate-400 tw-px-3">Loading tactics…</span>
			{:else if tactics.length > 0}
				<select
					bind:value={selectedTacticId}
					class="tw-bg-[#0f172a] tw-border tw-border-slate-700 tw-text-slate-200 tw-font-mono tw-text-sm tw-rounded-lg tw-px-3 tw-py-2 focus:tw-border-slate-500 focus:tw-outline-none tw-cursor-pointer hover:tw-border-slate-500 tw-transition-all"
				>
					{#each tactics as t (t.id)}
						<option value={t.id}>{t.name}</option>
					{/each}
				</select>
			{:else}
				<button
					type="button"
					class="tw-bg-slate-800 hover:tw-bg-slate-700 tw-border tw-border-slate-700 tw-text-slate-200 tw-font-mono tw-text-xs tw-font-semibold tw-px-4 tw-py-2 tw-rounded-lg tw-transition-all"
					onclick={openWarRoom}
				>
					⚡ Open War Room to Draw Play →
				</button>
			{/if}
		</div>
	</div>

	<!-- 12-Column Asymmetric Bento Grid -->
	<div class="tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-6">
		<!-- Left 7 Columns: Tactical Diagram Stage -->
		<div class="lg:tw-col-span-7 tw-flex tw-flex-col tw-gap-4">
			<CoachTacticalPreviewStage
				entities={activeTactic?.entities || []}
				routes={activeTactic?.routes || []}
				tacticName={activeTactic?.name || 'Tactical Strategy Blueprint'}
				onOpenWarRoom={openWarRoom}
			/>

			<!-- Tactical Context Box -->
			<div class="tw-bg-[#0f172a] tw-border tw-border-[#1e293b] tw-rounded-xl tw-p-4 tw-flex tw-items-center tw-justify-between tw-gap-3">
				<div>
					<span class="tw-font-mono tw-text-[10px] tw-font-bold tw-text-[#14b8a6] tw-uppercase tw-tracking-widest">
						Spatial Blueprint Note
					</span>
					<p class="tw-text-xs tw-text-slate-300 tw-mt-0.5">
						Tactical runs and pass routes adjust automatically when updated in the War Room.
					</p>
				</div>
				<button
					type="button"
					class="tw-bg-[#020617] hover:tw-bg-[#1e293b] tw-border tw-border-[#334155] tw-text-slate-300 hover:tw-text-white tw-font-mono tw-text-xs tw-px-3 tw-py-2 tw-rounded-lg tw-transition-colors"
					onclick={openWarRoom}
				>
					Launch War Room Board
				</button>
			</div>
		</div>

		<!-- Right 5 Columns: The Physical Drill Sheet Blueprint -->
		<div class="lg:tw-col-span-5 tw-bg-[#0f172a] tw-border tw-border-[#1e293b] tw-rounded-2xl tw-p-5 tw-flex tw-flex-col tw-gap-4 tw-shadow-2xl">
			<div class="tw-border-b tw-border-[#1e293b] tw-pb-3 tw-flex tw-items-center tw-justify-between">
				<div>
					<span class="tw-font-mono tw-text-[10px] tw-font-bold tw-text-[#fbbf24] tw-uppercase tw-tracking-widest">
						Physical Drill Sheet
					</span>
					<h3 class="tw-text-base tw-font-bold tw-text-white tw-mt-0.5">
						Session Specifications
					</h3>
				</div>
				<button
					type="button"
					class="tw-text-slate-400 hover:tw-text-white tw-font-mono tw-text-xs tw-flex tw-items-center tw-gap-1 tw-border tw-border-slate-700 tw-rounded-lg tw-px-2.5 tw-py-1.5 tw-bg-[#020617]"
					onclick={printDrillCard}
					title="Print Drill Card"
				>
					🖨️ Print
				</button>
			</div>

			<!-- Input Fields -->
			<div class="tw-space-y-3 tw-text-xs">
				<label class="tw-block">
					<span class="tw-font-mono tw-text-[11px] tw-text-slate-400 tw-uppercase">Drill Title</span>
					<input
						type="text"
						bind:value={drillTitle}
						placeholder="e.g. 4v3 Half-Space Penetration"
						class="tw-w-full tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-lg tw-px-3 tw-py-2 tw-text-white focus:tw-border-[#14b8a6] focus:tw-outline-none tw-mt-1 tw-font-sans"
					/>
				</label>

				<div class="tw-grid tw-grid-cols-2 tw-gap-3">
					<label class="tw-block">
						<span class="tw-font-mono tw-text-[11px] tw-text-slate-400 tw-uppercase">Focus Area</span>
						<select
							bind:value={focusArea}
							class="tw-w-full tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-lg tw-px-3 tw-py-2 tw-text-white focus:tw-border-[#14b8a6] focus:tw-outline-none tw-mt-1 tw-font-mono"
						>
							<option value="gameday">Tactics & Shape</option>
							<option value="ball_mastery">Passing & Receiving</option>
							<option value="foundation">Technical Mastery</option>
							<option value="cardio">Conditioning & Pace</option>
							<option value="core">Physical & Duel</option>
						</select>
					</label>

					<label class="tw-block">
						<span class="tw-font-mono tw-text-[11px] tw-text-slate-400 tw-uppercase">Age Bracket</span>
						<select
							bind:value={ageGroup}
							class="tw-w-full tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-lg tw-px-3 tw-py-2 tw-text-white focus:tw-border-[#14b8a6] focus:tw-outline-none tw-mt-1 tw-font-mono"
						>
							<option value="U6-U8">U6 / U8 (FUNdamentals)</option>
							<option value="U10-U12">U10 / U12 (Learn to Train)</option>
							<option value="U12-U14">U12 / U14 (Train to Train)</option>
							<option value="U16-U18">U16 / U18 (Train to Compete)</option>
							<option value="Senior">Senior / College Elite</option>
						</select>
					</label>
				</div>

				<div class="tw-grid tw-grid-cols-3 tw-gap-2">
					<label class="tw-block">
						<span class="tw-font-mono tw-text-[10px] tw-text-slate-400 tw-uppercase">Duration</span>
						<input
							type="number"
							bind:value={durationMinutes}
							min="1"
							max="120"
							class="tw-w-full tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-lg tw-px-2.5 tw-py-2 tw-text-white focus:tw-border-[#14b8a6] focus:tw-outline-none tw-mt-1 tw-font-mono"
						/>
					</label>

					<label class="tw-block">
						<span class="tw-font-mono tw-text-[10px] tw-text-slate-400 tw-uppercase">Player Count</span>
						<input
							type="text"
							bind:value={playerCount}
							placeholder="8-12 Players"
							class="tw-w-full tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-lg tw-px-2.5 tw-py-2 tw-text-white focus:tw-border-[#14b8a6] focus:tw-outline-none tw-mt-1"
						/>
					</label>

					<label class="tw-block">
						<span class="tw-font-mono tw-text-[10px] tw-text-slate-400 tw-uppercase">Grid Size</span>
						<input
							type="text"
							bind:value={gridDimensions}
							placeholder="40x30 yds"
							class="tw-w-full tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-lg tw-px-2.5 tw-py-2 tw-text-white focus:tw-border-[#14b8a6] focus:tw-outline-none tw-mt-1"
						/>
					</label>
				</div>

				<label class="tw-block">
					<span class="tw-font-mono tw-text-[11px] tw-text-slate-400 tw-uppercase">Equipment Checklist</span>
					<input
						type="text"
						bind:value={equipment}
						placeholder="Cones, balls, pinnies, agility poles"
						class="tw-w-full tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-lg tw-px-3 tw-py-2 tw-text-white focus:tw-border-[#14b8a6] focus:tw-outline-none tw-mt-1"
					/>
				</label>

				<label class="tw-block">
					<span class="tw-font-mono tw-text-[11px] tw-text-slate-400 tw-uppercase">Setup & Drill Rules</span>
					<textarea
						bind:value={setupDescription}
						rows="2"
						placeholder="Explain positioning, ball flow, and rotation pattern..."
						class="tw-w-full tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-lg tw-px-3 tw-py-2 tw-text-white focus:tw-border-[#14b8a6] focus:tw-outline-none tw-mt-1 tw-font-sans"
					></textarea>
				</label>

				<label class="tw-block">
					<span class="tw-font-mono tw-text-[11px] tw-text-[#14b8a6] tw-uppercase">Tactical Coaching Cues</span>
					<textarea
						bind:value={coachingPoints}
						rows="2"
						placeholder="Key cues for body shape, timing, and scanning..."
						class="tw-w-full tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-lg tw-px-3 tw-py-2 tw-text-white focus:tw-border-[#14b8a6] focus:tw-outline-none tw-mt-1 tw-font-sans"
					></textarea>
				</label>
			</div>

			<!-- Team Playbook & Deployment Area -->
			<div class="tw-bg-[#040814] tw-border tw-border-slate-800 tw-rounded-xl tw-p-4 tw-flex tw-flex-col tw-gap-3 tw-mt-1">
				<div class="tw-flex tw-items-center tw-justify-between">
					<div class="tw-flex tw-items-center tw-gap-2">
						<span class="tw-text-amber-400">📖</span>
						<span class="tw-font-mono tw-text-xs tw-font-bold tw-text-white tw-uppercase">Team Playbook Publication</span>
					</div>
					<span class="tw-font-mono tw-text-[10px] tw-text-[#14b8a6] tw-bg-[#14b8a6]/10 tw-border tw-border-[#14b8a6]/30 tw-px-2 tw-py-0.5 tw-rounded">
						War Room Sync
					</span>
				</div>
				<p class="tw-text-xs tw-text-slate-400 tw-leading-relaxed">
					Publish this drill to your Team Playbook to make it immediately accessible on the War Room whiteboard under the Drills tab.
				</p>
				<div class="tw-flex tw-flex-col sm:tw-flex-row tw-gap-2.5 tw-pt-1">
					<button
						type="button"
						class="tw-flex-1 tw-bg-[#14b8a6] hover:tw-bg-teal-400 tw-text-black tw-font-mono tw-text-xs tw-font-bold tw-py-3 tw-px-4 tw-rounded-xl tw-shadow-[0_0_15px_rgba(20,184,166,0.3)] active:tw-scale-[0.98] tw-transition-all tw-flex tw-items-center tw-justify-center tw-gap-2"
						disabled={isSaving}
						onclick={() => saveDrill(false)}
					>
						<span>💾 SAVE PLAYBOOK</span>
					</button>

					<button
						type="button"
						class="tw-flex-1 tw-bg-[#fbbf24] hover:tw-bg-amber-400 tw-text-black tw-font-mono tw-text-xs tw-font-bold tw-py-3 tw-px-4 tw-rounded-xl tw-shadow-[0_0_15px_rgba(251,191,36,0.3)] active:tw-scale-[0.98] tw-transition-all tw-flex tw-items-center tw-justify-center tw-gap-2"
						disabled={isSaving}
						onclick={() => saveDrill(true)}
					>
						<span>🚀 DEPLOY AS INTENT</span>
					</button>
				</div>
			</div>
		</div>
	</div>
</div>
