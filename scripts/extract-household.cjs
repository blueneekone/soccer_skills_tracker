const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, '../src/routes/(app)/parent/household/+page.svelte');
const content = fs.readFileSync(pagePath, 'utf8');

const enginePath = path.join(__dirname, '../src/routes/(app)/parent/household/HouseholdEngine.svelte.ts');
const arenaPath = path.join(__dirname, '../src/routes/(app)/parent/household/HouseholdArena.svelte');
const newPagePath = path.join(__dirname, '../src/routes/(app)/parent/household/+page.svelte');

// Extract the script block
const scriptMatch = content.match(/<script lang="ts">([\s\S]*?)<\/script>/);
const scriptContent = scriptMatch ? scriptMatch[1] : '';

// Extract HTML
const htmlContent = content.replace(/<script lang="ts">[\s\S]*?<\/script>/, '').trim();

// The script content can be mostly copied into HouseholdEngine, with some modifications.
// We'll just write it as a class.
const engineBase = `import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { untrack } from 'svelte';
import { httpsCallable } from 'firebase/functions';
import { collection, doc, getDoc, getDocs, limit, query, updateDoc, where, writeBatch, Timestamp } from 'firebase/firestore';
import { db, functions, auth } from '$lib/firebase.js';
import { lockBody, unlockBody } from '$lib/utils/modalLock.js';
import { authStore } from '$lib/stores/auth.svelte.js';
import type { HouseholdOperativeRow } from '$lib/types/household.js';
import { buildEnrichedOperativeRows, loadHouseholdOperativeRows } from '$lib/parent/householdOperatives.js';
import { fetchHouseholdClearance, guardsPassForHouseholdLoad, normalizeHouseholdId, shouldClearLoadBusy } from '$lib/parent/loadHouseholdClearance.js';

export class HouseholdEngine {
${scriptContent.replace(/const (\w+) = httpsCallable/g, '$1 = httpsCallable').replace(/let /g, '').replace(/const /g, '').replace(/\$effect\(\(\) => \{/g, 'init() { \\n$effect(() => {')}
    
    // Additional properties for co-parent
    coParentEmail = $state('');
    coParentBusy = $state(false);
    coParentErr = $state('');
    parentInviteCoParent = httpsCallable(functions, 'parentInviteCoParent');

    async inviteCoParent() {
        this.coParentErr = '';
        if (!this.coppaSigned) {
            this.coParentErr = 'Complete COPPA clearance before inviting a co-parent.';
            return;
        }
        if (!this.coParentEmail.includes('@')) {
            this.coParentErr = 'Enter a valid email address.';
            return;
        }
        this.coParentBusy = true;
        try {
            await this.parentInviteCoParent({ coParentEmail: this.coParentEmail });
            this.coParentEmail = '';
            // Just refresh local state or show success message if needed
        } catch (err: any) {
            this.coParentErr = err?.message || 'Failed to invite co-parent.';
        } finally {
            this.coParentBusy = false;
        }
    }
}
`;

fs.writeFileSync(enginePath, engineBase);

// We will write Arena manually via AI later, but for now just dump the HTML.
fs.writeFileSync(arenaPath, `<script lang="ts">
  import type { HouseholdEngine } from './HouseholdEngine.svelte.js';
  import Icon from '$lib/components/ui/Icon.svelte';
  import IntelModal from '$lib/components/ui/IntelModal.svelte';
  import ParentPrivacyDashboard from '$lib/components/compliance/ParentPrivacyDashboard.svelte';
  import TransferPortal from '$lib/components/player/TransferPortal.svelte';
  import type { IconName } from '$lib/icons/registry.js';
  
  interface Props {
      engine: HouseholdEngine;
  }
  let { engine }: Props = $props();
</script>

${htmlContent}
`);

fs.writeFileSync(newPagePath, `<script lang="ts">
  import { HouseholdEngine } from './HouseholdEngine.svelte.js';
  import HouseholdArena from './HouseholdArena.svelte';
  
  const engine = new HouseholdEngine();
  // engine.init(); // You can call any init logic if needed
</script>

<HouseholdArena {engine} />
`);
