<script lang="ts">
  import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
  import { getActiveDb } from '$lib/firebase.js';

  const { clubId } = $props<{ clubId: string }>();

  let sidcode = $state('');
  let seasonId = $state('');
  let selectedTeamId = $state('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let teams = $state<any[]>([]);
  let isBinding = $state(false);
  let lastAffinitySyncAt = $state<string | null>(null);

  $effect(() => {
    if (clubId) {
      loadTeams();
    }
  });

  async function loadTeams() {
    try {
      const db = getActiveDb();
      const q = query(collection(db, 'teams'), where('clubId', '==', clubId));
      const snap = await getDocs(q);
      teams = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.error('Failed to load teams:', e);
    }
  }

  async function handleBind() {
    if (!sidcode || !seasonId || !selectedTeamId) {
      alert('All fields are required.');
      return;
    }
    isBinding = true;
    try {
      const db = getActiveDb();
      await updateDoc(doc(db, 'teams', selectedTeamId), {
        sidcode: sidcode,
        seasonId: seasonId,
        lastAffinitySyncAt: serverTimestamp()
      });
      alert('Binding saved successfully.');
      lastAffinitySyncAt = new Date().toISOString();
    } catch (e) {
      console.error('Failed to bind team:', e);
      alert('Failed to bind team.');
    } finally {
      isBinding = false;
    }
  }
</script>

<div class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-[24px] tw-p-8 tw-mt-8">
  <h3 class="tw-text-[#FAFAFA] tw-text-xl tw-font-bold tw-mb-6">Affinity Sports API Sync</h3>
  
  <div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-3 tw-gap-6 tw-mb-8">
    <div>
      <label for="sidcode" class="tw-block tw-text-sm tw-font-bold tw-text-[#D4D4D8] tw-mb-2">SIDCODE</label>
      <input 
        id="sidcode"
        type="text" 
        bind:value={sidcode} 
        placeholder="e.g. AFC-001"
        class="tw-w-full tw-bg-[#1e293b] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-rounded-md tw-px-4 tw-py-2"
      />
    </div>
    
    <div>
      <label for="seasonId" class="tw-block tw-text-sm tw-font-bold tw-text-[#D4D4D8] tw-mb-2">SeasonID</label>
      <input 
        id="seasonId"
        type="text" 
        bind:value={seasonId} 
        placeholder="e.g. 2026-FALL"
        class="tw-w-full tw-bg-[#1e293b] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-rounded-md tw-px-4 tw-py-2"
      />
    </div>
    
    <div>
      <label for="teamSelect" class="tw-block tw-text-sm tw-font-bold tw-text-[#D4D4D8] tw-mb-2">Target Team</label>
      <select 
        id="teamSelect"
        bind:value={selectedTeamId}
        class="tw-w-full tw-bg-[#1e293b] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-rounded-md tw-px-4 tw-py-2"
      >
        <option value="">-- Select Team --</option>
        {#each teams as team}
          <option value={team.id}>{team.name || 'Unnamed Team'} ({team.id})</option>
        {/each}
      </select>
    </div>
  </div>

  <div class="tw-flex tw-items-center tw-justify-between">
    <div class="tw-font-mono tw-text-sm tw-text-[#A1A1AA]">
      Last Sync: 
      {#if lastAffinitySyncAt}
        <span class="tw-text-[#10B981]">{new Date(lastAffinitySyncAt).toLocaleString()}</span>
      {:else}
        <span class="tw-text-[#64748B]">Never</span>
      {/if}
    </div>
    
    <button 
      class="tw-bg-[#FAFAFA] tw-text-[#0f172a] tw-font-bold tw-px-6 tw-py-2 tw-rounded-md tw-hover:bg-[#D4D4D8] tw-transition-colors disabled:opacity-50"
      onclick={handleBind}
      disabled={isBinding || !sidcode || !seasonId || !selectedTeamId}
    >
      {isBinding ? 'Binding...' : 'Bind Configuration'}
    </button>
  </div>
</div>
