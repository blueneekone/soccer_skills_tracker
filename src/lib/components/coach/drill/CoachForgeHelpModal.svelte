<script lang="ts">
	import { lockBody, unlockBody } from '$lib/utils/modalLock.js';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	interface Props {
		open?: boolean;
		onClose?: () => void;
	}

	let { open = false, onClose = () => {} }: Props = $props();

	type SectionId = 'all' | 'overview' | 'intent' | 'designer' | 'library' | 'warroom' | 'tips';

	let activeSection = $state<SectionId>('all');
	let searchQuery = $state('');

	interface HelpTopic {
		id: string;
		section: SectionId;
		badge: string;
		badgeColor: string;
		title: string;
		subtitle: string;
		description: string;
		steps?: string[];
		proTips?: string[];
		tags: string[];
	}

	const HELP_TOPICS: HelpTopic[] = [
		{
			id: 'forge-overview',
			section: 'overview',
			badge: 'ARCHITECTURE',
			badgeColor: '#14b8a6',
			title: 'The Forge: Unified Tactical Studio',
			subtitle: 'The 3-stage pipeline connecting strategy to on-field execution',
			description: 'The Forge unifies three core coaching sub-systems into a cohesive workspace: the Intent Engine (tactical problem formulation), the Drill Designer (visual pitch diagramming), and the Drill Library (cataloging and deployment). Coaches can move effortlessly between defining problems, diagramming solutions, and assigning training routines to athletes.',
			steps: [
				'1. Formulate needs in Intent Engine: Analyze opponent tendencies or squad skill gaps.',
				'2. Diagram solutions in Drill Designer: Place players, draw passing routes, and define coaching constraints.',
				'3. Catalog in Drill Library: Store custom exercises and export printable sideline drill sheets.',
				'4. Rehearse in War Room: Take saved tactics directly into live match-day walkthroughs.'
			],
			tags: ['overview', 'forge', 'architecture', 'pipeline', 'workflow']
		},
		{
			id: 'intent-engine',
			section: 'intent',
			badge: 'INTENT ENGINE',
			badgeColor: '#14b8a6',
			title: 'Natural Language Tactical Formulation',
			subtitle: 'Translating tactical problems into targeted skill drills',
			description: 'The Intent Engine is an AI-backed tactical terminal. Enter real-world game situations in plain English (e.g., "Our fullbacks are getting caught high against wing transitions" or "Struggling to break down a 5-4-1 low block"). The engine scores matching exercises and aligns them with Scout\'s Six attributes.',
			steps: [
				'Enter Query: Type your tactical objective or pressing issue in the natural language bar.',
				'Review Match Rating: Inspect AI Match Scores (e.g. 96% Match) and targeted Scout\'s Six pillars (Pace, Technical, Game IQ, Physical, Mental, Defending).',
				'Deploy to Squad: Click "Deploy to Squad Intent" to push the drill directly into squad training queues and player daily bounties.'
			],
			proTips: [
				'Be specific with numbers and zones (e.g., "3v2 counter-attack in final third") for higher-precision drill recommendations.',
				'Drills deployed from the Intent Engine automatically earn XP for players upon completion.'
			],
			tags: ['intent', 'ai', 'natural language', 'scout six', 'bounty', 'tactical query']
		},
		{
			id: 'drill-designer-canvas',
			section: 'designer',
			badge: 'DRILL DESIGNER',
			badgeColor: '#daff0a',
			title: 'Pitch Whiteboard & Spatial Diagramming',
			subtitle: 'Interactive vector field canvas with kinetic routing',
			description: 'The Drill Designer Studio provides a professional vector pitch canvas to diagram training setups, spatial grids, player rotations, and ball trajectories. Tactics from the War Room load directly into the preview stage.',
			steps: [
				'Select Pitch Geometry: Choose from Full Pitch, Half Pitch, Penalty Box, or Small-Sided Grid.',
				'Place Equipment & Tokens: Position cones, mini-goals, hurdles, mannequins, and attacking/defending discs.',
				'Draw Vector Routes: Drag from any token to draw solid running routes (gold), dashed passing lanes (cyan), or dribbling trails.',
				'Adjust Ball & Passing Pivots: Drag the ball to anchor it to a player or place an intermediate pass pivot point.'
			],
			proTips: [
				'Use Friendly Cyan (#14b8a6) for offense and Opponent Gold (#fbbf24) for defensive structure.',
				'Double-click any route arrow to cycle line styling (pass, run, dribble).'
			],
			tags: ['designer', 'canvas', 'pitch', 'whiteboard', 'routes', 'cones', 'tokens', 'ball']
		},
		{
			id: 'drill-designer-blueprint',
			section: 'designer',
			badge: 'DRILL BLUEPRINT',
			badgeColor: '#daff0a',
			title: 'Coaching Blueprint & Sideline Drill Sheet',
			subtitle: 'Comprehensive drill metadata and printable physical cards',
			description: 'Every drill created in the Designer includes a full coaching blueprint with tactical parameters, constraints, and printable exports for the sideline.',
			steps: [
				'Configure Parameters: Set Focus Area (Ball Mastery, Gameday, Cardio, Foundation), Target Age Group, Player Count, Duration, and Intensity.',
				'Document Key Coaching Points: Add bulleted cues for player triggers (e.g. "Check shoulder before receiving", "Body shape open to field").',
				'List Common Mistakes & Corrections: Note frequent player breakdowns and how coaches should intervene.',
				'Export Physical Drill Sheet: Click "Export Physical Drill Sheet" to render a clean, high-contrast, printable sideline card.'
			],
			tags: ['blueprint', 'print', 'export', 'physical', 'pdf', 'coaching points', 'intensity']
		},
		{
			id: 'drill-library-arena',
			section: 'library',
			badge: 'DRILL LIBRARY',
			badgeColor: '#fbbf24',
			title: 'Drill Library Arena & Benchmark Catalog',
			subtitle: 'Pre-loaded professional drills and custom team playbook',
			description: 'The Drill Library is the master repository for all training exercises. It contains pre-populated benchmark drills across 8 sports (Soccer, Basketball, Football, Lacrosse, Hockey, Rugby, Baseball, Volleyball) and custom drills built by your staff.',
			steps: [
				'Filter & Search: Filter by Sport, Category (Tactics, Passing, Dribbling, Finishing, Conditioning), or Scout\'s Six trait.',
				'Preview Diagram: Click on any drill card to review its animated tactical vector diagram in the stage.',
				'Open in Designer: Click "Open in Designer" to clone, edit, or customize any drill diagram for your specific squad.',
				'Deploy to Squad: 1-click button to assign the exercise to team training plans.'
			],
			tags: ['library', 'catalog', 'benchmark', 'search', 'filter', 'clone', 'customize']
		},
		{
			id: 'war-room-bridge',
			section: 'warroom',
			badge: 'WAR ROOM BRIDGE',
			badgeColor: '#0ea5e9',
			title: 'War Room Integration & Match-Day Whiteboard',
			subtitle: 'Bridging drill design with real-time match tactics and rosters',
			description: 'The Forge connects directly to the live War Room (/coach/tactical). Tactical plays saved in the War Room populate the Drill Designer for curriculum development, and custom drills can be launched directly into the War Room for match-day reviews.',
			steps: [
				'Quick Launch: Use the "⚡ Open War Room" button in The Forge top bar to jump directly into the live board.',
				'Roster Hydration: In the War Room, squad athletes from your roster tray can be dropped directly onto the pitch with 1 click.',
				'Tactical Player Context HUD: Right-click any on-field player disc to open the floating context HUD—allowing instant player swaps with bench athletes, position pill assignment (ST, CAM, CB, etc.), team side toggling, and route clearing.'
			],
			proTips: [
				'Right-clicking an opponent token lets you designate specific opposing threats for pre-match briefings.',
				'Tactics created in the War Room are automatically archived under teams/{teamId}/tactics.'
			],
			tags: ['war room', 'roster', 'right-click', 'hud', 'tokens', 'matchday', 'swap']
		},
		{
			id: 'pro-tips-shortcuts',
			section: 'tips',
			badge: 'SHORTCUTS & TIPS',
			badgeColor: '#a855f7',
			title: 'Pro Tips & Sideline Operations',
			subtitle: 'Workflow acceleration for busy coaches on the pitch',
			description: 'Master these operational tips to navigate The Forge with maximum velocity during practices and match days.',
			steps: [
				'ESC Key: Closes any active modal, drawer, or help guide instantly.',
				'Tab Direct Linking: Add ?tab=designer, ?tab=library, or ?tab=intent to bookmarked Forge URLs.',
				'Tablet / Mobile Sideline Mode: Tap and drag tokens directly on touchscreens; use two fingers to zoom or pan.',
				'Reset to Entire Squad: In Team Telemetry, click "✕ Reset" to return from an individual athlete radar to squad average.'
			],
			tags: ['shortcuts', 'tips', 'hotkeys', 'mobile', 'tablet', 'sideline']
		}
	];

	const filteredTopics = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		return HELP_TOPICS.filter((t) => {
			const matchesSection = activeSection === 'all' || t.section === activeSection;
			if (!matchesSection) return false;
			if (!q) return true;
			return (
				t.title.toLowerCase().includes(q) ||
				t.subtitle.toLowerCase().includes(q) ||
				t.description.toLowerCase().includes(q) ||
				t.tags.some((tag) => tag.toLowerCase().includes(q))
			);
		});
	});

	function handleClose() {
		onClose();
	}

	function handleWinKey(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			handleClose();
		}
	}

	function handleBackdrop(e: MouseEvent) {
		if (e.target === e.currentTarget) handleClose();
	}

	$effect(() => {
		if (!open) return;
		lockBody();
		return () => unlockBody();
	});
</script>

<svelte:window onkeydown={handleWinKey} />

{#if open}
	<!-- Modal Backdrop -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="tw-fixed tw-inset-0 tw-z-[9999] tw-flex tw-items-center tw-justify-center tw-p-3 sm:tw-p-6 tw-bg-black/85 tw-backdrop-blur-md"
		role="presentation"
		transition:fade={{ duration: 150 }}
		onclick={handleBackdrop}
	>
		<!-- Modal Container -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="tw-relative tw-w-full tw-max-w-4xl tw-max-h-[90vh] tw-bg-[#080d1a] tw-border tw-border-slate-800 tw-rounded-2xl tw-shadow-[0_0_50px_rgba(0,0,0,0.8)] tw-flex tw-flex-col tw-overflow-hidden"
			role="dialog"
			aria-modal="true"
			aria-labelledby="forge-help-title"
			tabindex="-1"
			transition:fly={{ y: 20, duration: 250, easing: cubicOut }}
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header Bar -->
			<header class="tw-bg-[#040814] tw-border-b tw-border-slate-800/80 tw-px-6 tw-py-4 tw-flex tw-items-center tw-justify-between tw-gap-4">
				<div class="tw-flex tw-items-center tw-gap-3">
					<div class="tw-h-10 tw-w-10 tw-rounded-xl tw-bg-[#14b8a6]/10 tw-border tw-border-[#14b8a6]/40 tw-flex tw-items-center tw-justify-center tw-text-lg">
						📖
					</div>
					<div>
						<div class="tw-flex tw-items-center tw-gap-2">
							<h2 id="forge-help-title" class="tw-font-mono tw-font-black tw-text-sm sm:tw-text-base tw-tracking-widest tw-text-white tw-uppercase tw-m-0">
								THE FORGE · OPERATING MANUAL
							</h2>
							<span class="tw-bg-[#14b8a6]/15 tw-border tw-border-[#14b8a6]/40 tw-text-[#14b8a6] tw-font-mono tw-text-[9px] tw-font-bold tw-px-1.5 tw-py-0.5 tw-rounded">
								v2.4
							</span>
						</div>
						<p class="tw-font-mono tw-text-xs tw-text-slate-400 tw-m-0 tw-mt-0.5">
							Complete coach guide to Intent Engine, Drill Designer & Tactical Whiteboard
						</p>
					</div>
				</div>

				<!-- Close Button -->
				<button
					type="button"
					onclick={handleClose}
					class="tw-h-8 tw-w-8 tw-rounded-lg tw-bg-slate-900 hover:tw-bg-slate-800 tw-border tw-border-slate-700 tw-text-slate-400 hover:tw-text-white tw-flex tw-items-center tw-justify-center tw-font-mono tw-text-xs tw-transition-colors tw-cursor-pointer"
					title="Close manual (ESC)"
				>
					✕
				</button>
			</header>

			<!-- Navigation & Search Filter Toolbar -->
			<div class="tw-bg-[#0b1224] tw-border-b tw-border-slate-800/80 tw-px-6 tw-py-3 tw-flex tw-flex-col sm:tw-flex-row sm:tw-items-center tw-justify-between tw-gap-3">
				<!-- Category Tabs -->
				<nav class="tw-flex tw-items-center tw-gap-1.5 tw-overflow-x-auto tw-no-scrollbar" aria-label="Manual Sections">
					<button
						type="button"
						class="tw-font-mono tw-text-[11px] tw-font-bold tw-px-2.5 tw-py-1 tw-rounded-md tw-transition-colors tw-whitespace-nowrap {activeSection === 'all' ? 'tw-bg-[#14b8a6] tw-text-black' : 'tw-bg-slate-900 tw-text-slate-400 hover:tw-text-slate-200'}"
						onclick={() => activeSection = 'all'}
					>
						ALL
					</button>
					<button
						type="button"
						class="tw-font-mono tw-text-[11px] tw-font-bold tw-px-2.5 tw-py-1 tw-rounded-md tw-transition-colors tw-whitespace-nowrap {activeSection === 'intent' ? 'tw-bg-[#14b8a6] tw-text-black' : 'tw-bg-slate-900 tw-text-slate-400 hover:tw-text-slate-200'}"
						onclick={() => activeSection = 'intent'}
					>
						🎯 INTENT
					</button>
					<button
						type="button"
						class="tw-font-mono tw-text-[11px] tw-font-bold tw-px-2.5 tw-py-1 tw-rounded-md tw-transition-colors tw-whitespace-nowrap {activeSection === 'designer' ? 'tw-bg-[#14b8a6] tw-text-black' : 'tw-bg-slate-900 tw-text-slate-400 hover:tw-text-slate-200'}"
						onclick={() => activeSection = 'designer'}
					>
						📐 DESIGNER
					</button>
					<button
						type="button"
						class="tw-font-mono tw-text-[11px] tw-font-bold tw-px-2.5 tw-py-1 tw-rounded-md tw-transition-colors tw-whitespace-nowrap {activeSection === 'library' ? 'tw-bg-[#14b8a6] tw-text-black' : 'tw-bg-slate-900 tw-text-slate-400 hover:tw-text-slate-200'}"
						onclick={() => activeSection = 'library'}
					>
						📚 LIBRARY
					</button>
					<button
						type="button"
						class="tw-font-mono tw-text-[11px] tw-font-bold tw-px-2.5 tw-py-1 tw-rounded-md tw-transition-colors tw-whitespace-nowrap {activeSection === 'warroom' ? 'tw-bg-[#14b8a6] tw-text-black' : 'tw-bg-slate-900 tw-text-slate-400 hover:tw-text-slate-200'}"
						onclick={() => activeSection = 'warroom'}
					>
						⚡ WAR ROOM
					</button>
					<button
						type="button"
						class="tw-font-mono tw-text-[11px] tw-font-bold tw-px-2.5 tw-py-1 tw-rounded-md tw-transition-colors tw-whitespace-nowrap {activeSection === 'tips' ? 'tw-bg-[#14b8a6] tw-text-black' : 'tw-bg-slate-900 tw-text-slate-400 hover:tw-text-slate-200'}"
						onclick={() => activeSection = 'tips'}
					>
						💡 TIPS
					</button>
				</nav>

				<!-- Quick Filter Input -->
				<div class="tw-relative tw-w-full sm:tw-w-56">
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Search guide (e.g. routes)..."
						class="tw-w-full tw-bg-slate-950 tw-border tw-border-slate-800 focus:tw-border-[#14b8a6] tw-text-slate-200 tw-font-mono tw-text-xs tw-rounded-lg tw-px-3 tw-py-1.5 tw-outline-none placeholder:tw-text-slate-600"
					/>
					{#if searchQuery}
						<button
							type="button"
							onclick={() => searchQuery = ''}
							class="tw-absolute tw-right-2 tw-top-1.5 tw-text-slate-500 hover:tw-text-white tw-font-mono tw-text-xs"
						>
							✕
						</button>
					{/if}
				</div>
			</div>

			<!-- Scrollable Content Body -->
			<div class="tw-p-6 tw-overflow-y-auto tw-flex tw-flex-col tw-gap-6 tw-flex-1">
				{#if filteredTopics.length === 0}
					<div class="tw-p-12 tw-text-center tw-border tw-border-dashed tw-border-slate-800 tw-rounded-xl">
						<p class="tw-font-mono tw-text-sm tw-text-slate-400 tw-m-0">
							No manual topics found matching "{searchQuery}". Try searching for "routes", "print", "scout", or "intent".
						</p>
					</div>
				{:else}
					{#each filteredTopics as topic (topic.id)}
						<article class="tw-bg-[#040814] tw-border tw-border-slate-800/90 tw-rounded-xl tw-p-5 tw-shadow-md">
							<!-- Topic Header -->
							<div class="tw-flex tw-items-center tw-justify-between tw-gap-3 tw-mb-2">
								<div class="tw-flex tw-items-center tw-gap-2.5">
									<span
										class="tw-font-mono tw-text-[9px] tw-font-black tw-px-2 tw-py-0.5 tw-rounded tw-uppercase tw-border"
										style="background-color: {topic.badgeColor}15; border-color: {topic.badgeColor}40; color: {topic.badgeColor};"
									>
										{topic.badge}
									</span>
									<h3 class="tw-font-mono tw-font-black tw-text-sm sm:tw-text-base tw-text-white tw-m-0">
										{topic.title}
									</h3>
								</div>
							</div>

							<p class="tw-font-mono tw-text-xs tw-text-[#14b8a6] tw-mt-0.5 tw-mb-3">
								{topic.subtitle}
							</p>

							<p class="tw-text-slate-300 tw-text-sm tw-leading-relaxed tw-mb-4">
								{topic.description}
							</p>

							<!-- Steps / How-To Checklist -->
							{#if topic.steps && topic.steps.length > 0}
								<div class="tw-bg-[#080d1a] tw-border tw-border-slate-800/80 tw-rounded-lg tw-p-3.5 tw-mb-3">
									<h4 class="tw-font-mono tw-text-[11px] tw-font-black tw-uppercase tw-tracking-wider tw-text-slate-400 tw-m-0 tw-mb-2">
										Execution Protocol:
									</h4>
									<ul class="tw-list-none tw-p-0 tw-m-0 tw-flex tw-flex-col tw-gap-2">
										{#each topic.steps as step}
											<li class="tw-flex tw-items-start tw-gap-2 tw-text-xs tw-text-slate-300 tw-leading-normal">
												<span class="tw-text-[#14b8a6] tw-font-mono tw-mt-0.5">▶</span>
												<span>{step}</span>
											</li>
										{/each}
									</ul>
								</div>
							{/if}

							<!-- Pro Tips if available -->
							{#if topic.proTips && topic.proTips.length > 0}
								<div class="tw-bg-[#daff0a]/5 tw-border tw-border-[#daff0a]/20 tw-rounded-lg tw-p-3">
									<h4 class="tw-font-mono tw-text-[11px] tw-font-black tw-uppercase tw-tracking-wider tw-text-[#daff0a] tw-m-0 tw-mb-1.5 tw-flex tw-items-center tw-gap-1.5">
										<span>⚡</span> Pro Coach Tips:
									</h4>
									<ul class="tw-list-none tw-p-0 tw-m-0 tw-flex tw-flex-col tw-gap-1.5">
										{#each topic.proTips as tip}
											<li class="tw-text-xs tw-text-slate-300 tw-leading-normal tw-flex tw-items-start tw-gap-2">
												<span class="tw-text-[#daff0a] tw-font-mono">✓</span>
												<span>{tip}</span>
											</li>
										{/each}
									</ul>
								</div>
							{/if}
						</article>
					{/each}
				{/if}
			</div>

			<!-- Modal Footer -->
			<footer class="tw-bg-[#040814] tw-border-t tw-border-slate-800/80 tw-px-6 tw-py-3.5 tw-flex tw-flex-col sm:tw-flex-row sm:tw-items-center tw-justify-between tw-gap-3">
				<span class="tw-font-mono tw-text-[11px] tw-text-slate-500">
					Press <kbd class="tw-bg-slate-900 tw-border tw-border-slate-700 tw-text-slate-300 tw-px-1.5 tw-py-0.5 tw-rounded">ESC</kbd> or click outside to dismiss
				</span>
				<button
					type="button"
					onclick={handleClose}
					class="tw-bg-[#14b8a6] hover:tw-bg-[#0d9488] active:tw-scale-[0.98] tw-text-black tw-font-mono tw-text-xs tw-font-bold tw-px-4 tw-py-1.5 tw-rounded-lg tw-transition-all tw-cursor-pointer"
				>
					Got It, Close Manual
				</button>
			</footer>
		</div>
	</div>
{/if}
