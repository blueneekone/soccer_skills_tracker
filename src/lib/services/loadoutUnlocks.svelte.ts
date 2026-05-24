/**
 * loadoutUnlocks.svelte.ts — Sprint 3.3 unlock ceremony queue
 *
 * Diffs `ownedCosmetics` from Firestore snapshot vs sessionStorage
 * lastAcknowledged per email. Never trusts optimistic authStore patches.
 */

import { browser } from '$app/environment';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '$lib/firebase.js';
import { ceremonyOnCosmeticUnlock } from '$lib/services/dopamine.svelte.js';

export type LoadoutUnlockCeremonyItem = {
	cosmeticId: string;
	replay?: boolean;
};

const ACK_PREFIX = 'sst-loadout-unlock-ack:';

function ackStorageKey(email: string): string {
	return `${ACK_PREFIX}${email.toLowerCase()}`;
}

function readAcknowledged(email: string): Set<string> {
	if (!browser) return new Set();
	try {
		const raw = sessionStorage.getItem(ackStorageKey(email));
		if (!raw) return new Set();
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return new Set();
		return new Set(parsed.filter((id) => typeof id === 'string'));
	} catch {
		return new Set();
	}
}

function writeAcknowledged(email: string, ids: Set<string>): void {
	if (!browser) return;
	try {
		sessionStorage.setItem(ackStorageKey(email), JSON.stringify([...ids].sort()));
	} catch {
		/* ignore quota */
	}
}

let queue = $state<LoadoutUnlockCeremonyItem[]>([]);
/** @type {Set<string>} */
const baselineSeededEmails = new Set();
/** @type {null | (() => void)} */
let profileUnsub = null;
let activeEmail = '';

export const loadoutUnlockQueue = {
	get queue() {
		return queue;
	},
	get active() {
		return queue[0] ?? null;
	},
};

/**
 * Subscribe to users/{email} ownedCosmetics; enqueue ceremonies for new ids.
 * @param {string} email
 */
export function connectLoadoutUnlockListener(email: string): void {
	if (!browser) return;
	const key = email.trim().toLowerCase();
	if (!key) {
		disconnectLoadoutUnlockListener();
		return;
	}
	if (key === activeEmail && profileUnsub) return;

	disconnectLoadoutUnlockListener();
	activeEmail = key;

	const userRef = doc(db, 'users', key);
	profileUnsub = onSnapshot(
		userRef,
		(snap) => {
			if (!snap.exists()) return;
			const ownedRaw = snap.data()?.ownedCosmetics;
			const owned = Array.isArray(ownedRaw) ?
				ownedRaw.filter((id): id is string => typeof id === 'string')
			:	[];
			syncOwnedCosmeticsFromServer(key, owned);
		},
		(err) => {
			console.warn('[loadoutUnlocks] users/{email} listener', err);
		},
	);
}

export function disconnectLoadoutUnlockListener(): void {
	if (profileUnsub) {
		profileUnsub();
		profileUnsub = null;
	}
	activeEmail = '';
}

/**
 * @param {string} email
 * @param {string[]} ownedFromServer
 */
export function syncOwnedCosmeticsFromServer(email: string, ownedFromServer: string[]): void {
	const key = email.trim().toLowerCase();
	if (!key) return;

	const ownedSet = new Set(ownedFromServer);
	let acknowledged = readAcknowledged(key);

	// First snapshot per session: seed ack from server baseline (no retroactive ceremonies).
	if (!baselineSeededEmails.has(key) && acknowledged.size === 0) {
		baselineSeededEmails.add(key);
		writeAcknowledged(key, ownedSet);
		acknowledged = ownedSet;
		return;
	}
	baselineSeededEmails.add(key);

	const pendingIds = new Set(queue.map((item) => item.cosmeticId));

	for (const cosmeticId of ownedSet) {
		if (acknowledged.has(cosmeticId) || pendingIds.has(cosmeticId)) continue;
		queue = [...queue, { cosmeticId }];
	}
}

/**
 * Replay ceremony for an already-owned id (modal only — no re-grant).
 * @param {string} cosmeticId
 */
export function replayLoadoutUnlockCeremony(cosmeticId: string): void {
	if (!cosmeticId) return;
	queue = [...queue, { cosmeticId, replay: true }];
}

/**
 * Dismiss active ceremony; mark id acknowledged unless this was a Replay.
 * @param {string} email
 */
export function completeActiveLoadoutCeremony(email: string): void {
	const active = queue[0];
	if (!active) return;

	const key = email.trim().toLowerCase();
	if (!key) return;

	if (!active.replay) {
		const acknowledged = readAcknowledged(key);
		acknowledged.add(active.cosmeticId);
		writeAcknowledged(key, acknowledged);
	}

	queue = queue.slice(1);
}

export function resetLoadoutUnlockQueue(): void {
	queue = [];
	baselineSeededEmails.clear();
}
