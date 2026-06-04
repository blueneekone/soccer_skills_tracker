<script>
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { untrack } from 'svelte';
  import { authStore } from '$lib/stores/auth.svelte.js';
  import { teamsStore } from '$lib/stores/teams.svelte.js';
  import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';
  import { sportsConfigStore } from '$lib/stores/sportsConfigStore.svelte.js';
  import { IntentEngine } from './IntentEngine.svelte.js';
  import IntentArena from './IntentArena.svelte';
  import IntentHUD from './IntentHUD.svelte';

  const engine = new IntentEngine();

  // ── Role guard ────────────────────────────────────────────────────────────────
  const ALLOWED_ROLES = ['coach', 'director', 'global_admin', 'super_admin'];
  const role = $derived(authStore.role);

  $effect(() => {
    if (!browser) return;
    if (!authStore.isLoading && !ALLOWED_ROLES.includes(role)) {
      untrack(() => goto('/home'));
    }
  });

  // ── Team resolution (same pattern as /coach/drills) ──────────────────────────
  const myEmail = $derived((authStore.user?.email || '').toLowerCase());
  const myTeams = $derived.by(() => {
    if (!teamsStore.loaded) return [];
    if (role === 'super_admin' || role === 'global_admin' || role === 'director') {
      return teamsStore.teams.slice();
    }
    if (!myEmail) return [];
    return teamsStore.getCoachTeams(myEmail);
  });

  let selectedTeamId = $state('');
  $effect(() => {
    const teams = myTeams;
    if (teams.length === 0) return;
    const pivot = workspaceContextStore.activeTeamId?.trim();
    if (pivot && teams.some((t) => t.id === pivot)) {
      if (selectedTeamId !== pivot) selectedTeamId = pivot;
      return;
    }
    if (!selectedTeamId || !teams.some((t) => t.id === selectedTeamId)) {
      selectedTeamId = teams[0].id;
    }
  });

  // ── Engine lifecycle ──────────────────────────────────────────────────────────
  const tenantId = $derived(authStore.tenantId);
  const clubId = $derived(authStore.tenantId); // tenantId === clubId on this platform
  const sportId = $derived(sportsConfigStore.currentSportConfig?.sportId ?? 'soccer');

  $effect(() => {
    if (!browser || !selectedTeamId || !tenantId) return;
    engine.connect(selectedTeamId, tenantId, clubId, sportId);
    return () => engine.destroy();
  });

  const currentTeam = $derived(myTeams.find((t) => t.id === selectedTeamId));
</script>

<svelte:head>
  <title>Coach · Intent Engine · NEXUS COMMAND</title>
</svelte:head>

<div class="tw-relative tw-min-h-screen tw-w-full tw-bg-[#020202] tw-font-mono">
  <!-- Header -->
  <header
    class="tw-bg-[#020202] tw-border-b tw-border-[#14b8a6]/10 tw-px-5 tw-py-4 tw-flex tw-items-center tw-justify-between tw-gap-4"
  >
    <div class="tw-flex tw-flex-col tw-gap-0.5">
      <h1 class="tw-text-2xl tw-font-black tw-tracking-tight tw-text-white">
        <span class="tw-text-[#14b8a6]">INTENT</span> ENGINE
      </h1>
      <p class="tw-text-[10px] tw-tracking-widest tw-text-white/30 tw-uppercase">
        [ TACTICAL ASSIGNMENT TERMINAL ]
      </p>
    </div>

    <div class="tw-flex tw-items-center tw-gap-3">
      {#if currentTeam}
        <span class="tw-text-[11px] tw-text-white/40 tw-font-mono tw-tracking-wide">
          &#x25B6; {currentTeam.name}
        </span>
      {/if}

      {#if myTeams.length > 1}
        <select
          bind:value={selectedTeamId}
          class="tw-bg-[#020202] tw-border tw-border-[#14b8a6]/20 tw-text-white/80 tw-rounded-lg tw-px-3 tw-py-2 tw-font-mono tw-text-xs tw-outline-none tw-cursor-pointer hover:tw-border-[#14b8a6]/40 tw-transition-colors"
        >
          {#each myTeams as team (team.id)}
            <option value={team.id}>{team.name}</option>
          {/each}
        </select>
      {/if}
    </div>
  </header>

  <!-- Main content -->
  <main class="tw-px-5 tw-py-6 tw-pb-52">
    <IntentArena
      intents={engine.enrichedIntents}
      isLoading={engine.isLoadingIntents}
      mutationError={engine.mutationError}
      onCancel={(id) => engine.cancelIntent(id)}
      onExtend={(id, days) => engine.extendIntent(id, days)}
    />
  </main>
</div>

<!-- IntentHUD renders itself fixed bottom-right, placed outside main flow -->
<IntentHUD
  attributes={engine.attributes}
  roster={engine.roster}
  bind:draftAttributeId={engine.draftAttributeId}
  bind:draftRequiredXp={engine.draftRequiredXp}
  bind:draftDurationDays={engine.draftDurationDays}
  bind:draftScope={engine.draftScope}
  bind:draftTargetUids={engine.draftTargetUids}
  bind:draftPriority={engine.draftPriority}
  bind:draftPrescriptionSets={engine.draftPrescriptionSets}
  bind:draftPrescriptionRepsPerSet={engine.draftPrescriptionRepsPerSet}
  bind:draftPrescriptionBilateral={engine.draftPrescriptionBilateral}
  bind:draftPrescriptionDurationMin={engine.draftPrescriptionDurationMin}
  bind:draftPrescriptionTargetRpe={engine.draftPrescriptionTargetRpe}
  deployPhase={engine.deployPhase}
  deployError={engine.deployError}
  isLoadingRoster={engine.isLoadingRoster}
  canDeploy={engine.canDeploy}
  onDeploy={() => engine.deployIntent()}
  onToggleUid={(uid) => engine.toggleDraftUid(uid)}
  onSelectAll={() => engine.selectAllRosterUids()}
  onClearSelection={() => engine.clearRosterSelection()}
/>
