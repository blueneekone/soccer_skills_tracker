<script lang="ts">
  import { untrack } from 'svelte';

  // Svelte 5 TypeScript Definitions
  interface ChoiceOption {
    id: string;
    title: string;
    description: string;
    votes: number;
  }

  interface Props {
    matchId?: string;
    ageGroup?: number; // e.g., 12 for Under-12s
    initialOptions?: ChoiceOption[];
  }

  // Props Destructuring using Svelte 5 Runes
  let {
    matchId = 'active-match',
    ageGroup = 14,
    initialOptions = [
      { id: 'opt-1', title: 'A: High-Press Transition', description: 'Attack wide spaces immediately on turnover.', votes: 8 },
      { id: 'opt-2', title: 'B: Compact Mid-Block Counter', description: 'Conserve energy, absorb pressure, strike deep.', votes: 6 }
    ]
  }: Props = $props();

  // Svelte 5 Reactive States
  let options = $state<ChoiceOption[]>(initialOptions);
  let rationale = $state<string>('');
  let isSubmitting = $state<boolean>(false);
  let customOptionTitle = $state<string>('');
  let customOptionDesc = $state<string>('');

  // Svelte 5 Derived States
  let totalVotes = $derived.by(() => {
    return options.reduce((sum, opt) => sum + opt.votes, 0);
  });

  let u13BalancedMandateActive = $derived.by(() => {
    return ageGroup < 13;
  });

  // Action Handlers (strictly under 80 lines of code)
  export function castVote(optionId: string) {
    options = options.map(opt => {
      if (opt.id === optionId) {
        return { ...opt, votes: opt.votes + 1 };
      }
      return opt;
    });
  }

  export function addCustomOption() {
    if (!customOptionTitle.trim()) return;
    const newOption: ChoiceOption = {
      id: `custom-${Date.now()}`,
      title: customOptionTitle,
      description: customOptionDesc || 'Coach-defined tactical modification.',
      votes: 0
    };
    options = [...options, newOption];
    customOptionTitle = '';
    customOptionDesc = '';
  }

  export async function commitHalftimePlan() {
    isSubmitting = true;
    try {
      // Simulate atomic database write trigger with rationale preservation
      console.log(`[Database Write] Committing Halftime Plan:`, {
        matchId,
        options,
        rationale,
        timestamp: new Date().toISOString()
      });
      // Simulate network latency matching the 14ms requirement
      await new Promise(resolve => setTimeout(resolve, 100));
    } finally {
      isSubmitting = false;
    }
  }

  // Svelte 5 effect to handle telemetry updates without triggering reactive rendering loops
  $effect(() => {
    if (rationale || options) {
      untrack(() => {
        console.log(`[Telemetry Sync] Halftime Choice Planner state mutated. Active Options: ${options.length}`);
      });
    }
  });
</script>

<div class="tw-w-full tw-bg-black tw-text-[#14b8a6] tw-border tw-border-slate-800 tw-p-6 tw-flex tw-flex-col tw-h-full tw-font-mono">
  
  <!-- Header: Strict 90-degree Corners (No Chamfers for Coach OS) -->
  <header class="tw-border-b tw-border-slate-800 tw-pb-4 tw-mb-6">
    <div class="tw-flex tw-items-center tw-gap-2">
      <div class="tw-w-2 tw-h-2 tw-bg-[#14b8a6] tw-animate-pulse"></div>
      <span class="tw-text-xs tw-tracking-widest tw-font-bold">COACH OS // HALFTIME ATHLETE CHOICE PLANNER</span>
    </div>
    <h2 class="tw-text-xl tw-font-sans tw-font-bold tw-text-slate-100 tw-mt-1">Halftime Tactical Alignment</h2>
  </header>

  <!-- Under U13 Autonomy and Balanced Playtime Indicator -->
  {#if u13BalancedMandateActive}
    <div class="tw-bg-[#0f172a] tw-border-l-2 tw-border-[#14b8a6] tw-p-4 tw-mb-6">
      <p class="tw-text-xs tw-text-slate-300">
        <span class="tw-text-[#14b8a6] tw-font-bold">U13 SAFEGUARD ACTIVE:</span> 
        Under-13 developmental play requires balanced playtime workloads. Scoring is focused strictly on fundamental motor learning rather than ego competitive metrics.
      </p>
    </div>
  {/if}

  <!-- Asymmetric Bento Layout: 8-col Primary Tactics / 4-col Sidebar -->
  <div class="tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-6 tw-flex-1 tw-overflow-y-auto">
    
    <!-- Primary Choice Slots (8 Columns) -->
    <div class="lg:tw-col-span-8 tw-flex tw-flex-col tw-gap-4">
      <h3 class="tw-text-sm tw-text-slate-400 tw-tracking-wider tw-uppercase">Active Tactical Choice Slots</h3>
      
      <div class="tw-flex tw-flex-col tw-gap-3">
        {#each options as option (option.id)}
          <div class="tw-bg-[#0f172a] tw-border tw-border-slate-800 tw-p-4 tw-flex tw-flex-col sm:tw-flex-row tw-justify-between tw-items-start sm:tw-items-center tw-transition-colors hover:tw-border-slate-700">
            <div class="tw-flex-1">
              <h4 class="tw-text-slate-100 tw-text-sm tw-font-bold">{option.title}</h4>
              <p class="tw-text-xs tw-text-slate-400 tw-mt-1">{option.description}</p>
              
              <!-- Real-time Vote Progress Bar -->
              <div class="tw-w-full tw-bg-black tw-h-1.5 tw-mt-3 tw-border tw-border-slate-800">
                <div 
                  class="tw-bg-[#14b8a6] tw-h-full" 
                  style="width: {totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0}%">
                </div>
              </div>
            </div>
            
            <div class="tw-flex tw-items-center tw-gap-4 tw-mt-3 sm:tw-mt-0 tw-self-end sm:tw-self-center">
              <span class="tw-text-xs tw-text-slate-400">
                Votes: <span class="tw-text-slate-100 tw-font-bold">{option.votes}</span>
              </span>
              <button 
                class="tw-border tw-border-[#14b8a6] tw-bg-black hover:tw-bg-[#14b8a6] hover:tw-text-black tw-px-3 tw-py-1 tw-text-xs tw-transition-colors"
                onclick={() => castVote(option.id)}>
                +1 VOTE
              </button>
            </div>
          </div>
        {/each}
      </div>

      <!-- Add Custom Tactical Choice (Autonomy Builder) -->
      <div class="tw-border tw-border-slate-800 tw-p-4 tw-bg-black tw-mt-4">
        <h4 class="tw-text-xs tw-text-slate-400 tw-tracking-wider tw-uppercase tw-mb-3">Draft Custom Tactical Choice</h4>
        <div class="tw-flex tw-flex-col sm:tw-flex-row tw-gap-3">
          <input 
            type="text" 
            placeholder="Choice Title (e.g. C: High Width Transition)" 
            class="tw-bg-[#0f172a] tw-border tw-border-slate-800 tw-p-2 tw-text-xs tw-text-slate-100 tw-flex-1 focus:tw-outline-none focus:tw-border-[#14b8a6]"
            bind:value={customOptionTitle} />
          <input 
            type="text" 
            placeholder="Description / Implementation Details" 
            class="tw-bg-[#0f172a] tw-border tw-border-slate-800 tw-p-2 tw-text-xs tw-text-slate-100 tw-flex-1 focus:tw-outline-none focus:tw-border-[#14b8a6]"
            bind:value={customOptionDesc} />
          <button 
            class="tw-bg-black tw-border tw-border-[#14b8a6] tw-text-[#14b8a6] hover:tw-bg-[#14b8a6] hover:tw-text-black tw-px-4 tw-py-2 tw-text-xs tw-transition-colors tw-font-bold"
            onclick={addCustomOption}>
            ADD SLOT
          </button>
        </div>
      </div>
    </div>

    <!-- Rationale & Commitment Panel (4 Columns) -->
    <div class="lg:tw-col-span-4 tw-flex tw-flex-col tw-gap-4 tw-border-t lg:tw-border-t-0 lg:tw-border-l tw-border-slate-800 lg:tw-pl-6 tw-pt-4 lg:tw-pt-0">
      <h3 class="tw-text-sm tw-text-slate-400 tw-tracking-wider tw-uppercase">Strategic Rationale</h3>
      
      <div class="tw-flex tw-flex-col tw-gap-2">
        <label for="rationale-input" class="tw-text-xs tw-text-slate-400">Explain the "WHY" behind this choice slot to the players:</label>
        <textarea 
          id="rationale-input"
          rows="4" 
          placeholder="e.g. We are offering this choice so you can decide how we open up wide spaces during transition. It gives you ownership over our central press."
          class="tw-bg-[#0f172a] tw-border tw-border-slate-800 tw-p-3 tw-text-xs tw-text-slate-100 focus:tw-outline-none focus:tw-border-[#14b8a6] tw-resize-none tw-leading-relaxed"
          bind:value={rationale}></textarea>
      </div>

      <div class="tw-bg-[#0f172a] tw-border tw-border-slate-800 tw-p-4 tw-mt-2">
        <h4 class="tw-text-xs tw-text-slate-300 tw-font-bold tw-mb-2">Autonomy-Supportive Rationale</h4>
        <p class="tw-text-[11px] tw-text-slate-400 tw-leading-relaxed">
          Providing a tactical rationale increases intrinsic motivation and player game intelligence under pressure. By engaging players in choice loops, they take true ownership of the game plan.
        </p>
      </div>

      <!-- Action Button (No Action Gold in Coach OS) -->
      <button 
        class="tw-w-full tw-bg-[#14b8a6] tw-text-black hover:tw-bg-black hover:tw-text-[#14b8a6] tw-border tw-border-[#14b8a6] tw-py-3 tw-text-xs tw-font-bold tw-transition-colors tw-mt-auto"
        onclick={commitHalftimePlan}
        disabled={isSubmitting}>
        {#if isSubmitting}
          COMMITTING PLAN TO HUD...
        {:else}
          LOCK PLAN & SYNC PLAYER CARDS
        {/if}
      </button>
    </div>

  </div>
</div>
