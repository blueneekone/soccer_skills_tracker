import { untrack } from 'svelte';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { authStore } from '$lib/stores/auth.svelte.js';

export class RewardsEngine {
    rewards = $state<any[]>([]);
    autoApprove = $state(false);
    loading = $state(true);
    error = $state('');
    saving = $state(false);
    fundingSourceId = $state('');
    
    private unsubscribe: (() => void) | null = null;

    constructor() {
        // We will initialize directly since effect causes effect_orphan during vitest in non-component context
        this.init();
    }

    private init() {
        if (!authStore.isAuthenticated) {
            this.loading = false;
            return;
        }
        
        const db = getFirestore();
        if (!db) return;

        const householdId = authStore.claims?.householdId;
        if (!householdId) {
            this.loading = false;
            return;
        }

        const householdRef = doc(db, 'households', householdId);
        this.unsubscribe = onSnapshot(householdRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                this.autoApprove = !!data.autoApproveRewards;
            }
        });

        this.loadCatalog();
    }

    async loadCatalog() {
        const functions = getFunctions();
        const listCatalog = httpsCallable(functions, 'listRewardCatalog');
        try {
            this.loading = true;
            const res: any = await listCatalog();
            this.rewards = res.data?.campaigns || [];
        } catch (err: any) {
            this.error = err.message || 'Failed to load rewards.';
        } finally {
            this.loading = false;
        }
    }

    async toggleAutoApprove() {
        const newValue = !this.autoApprove;
        
        this.saving = true;
        
        const db = getFirestore();
        if (!db || !authStore.isAuthenticated) {
            this.saving = false;
            return;
        }
        
        const householdId = authStore.claims?.householdId;
        if (!householdId) {
            this.saving = false;
            return;
        }

        try {
            await setDoc(doc(db, 'households', householdId), { autoApproveRewards: newValue }, { merge: true });
            this.autoApprove = newValue;
        } catch (err: any) {
            this.error = 'Failed to update auto-approve setting.';
        } finally {
            this.saving = false;
        }
    }

    async issueReward(campaignId: string, denomination: number, childId: string, milestoneId: string) {
        if (!this.fundingSourceId) {
            this.error = 'Please provide a funding source ID.';
            return;
        }

        this.saving = true;
        const functions = getFunctions();
        const issue = httpsCallable(functions, 'issueMilestoneReward');
        try {
            await issue({
                campaignId,
                denomination,
                childId,
                milestoneId,
                fundingSourceId: this.fundingSourceId
            });
        } catch (err: any) {
            this.error = err.message || 'Failed to issue reward.';
        } finally {
            this.saving = false;
        }
    }

    cleanup() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }
}
