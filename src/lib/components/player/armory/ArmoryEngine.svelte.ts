import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '$lib/firebase.js';
import { getFunctions as getFns, httpsCallable as httpsCall } from 'firebase/functions';
import { browser } from '$app/environment';

export class ArmoryStudioEngine {
	gritXp = $state(0);
	unlockedCosmetics = $state<string[]>([]);
	equipped = $state<Record<string, string>>({
		base: 'DEFAULT-BASE',
		torso: '',
		footwear: '',
		head: '',
		expression: ''
	});
	loading = $state(true);

	constructor() {}

	connect(uid: string) {
		if (!browser || !uid || !db) return () => {};
		const unsub = onSnapshot(doc(db, 'users', uid), (snap) => {
			this.loading = false;
			if (snap.exists()) {
				const d = snap.data();
				this.gritXp = d.xp || 0;
				this.unlockedCosmetics = d.unlocked_cosmetics || [];
				if (d.avatar_loadout) {
					this.equipped = { ...this.equipped, ...d.avatar_loadout };
				}
			}
		});
		return unsub;
	}

	async unlockItem(assetId: string) {
		const fns = getFns();
		const unlockFn = httpsCall(fns, 'unlockAvatarComponent');
		try {
			await unlockFn({ assetId });
		} catch (err) {
			console.error('Failed to unlock:', err);
		}
	}

	async equipItem(item: any) {
		if (item.isPremium && !this.unlockedCosmetics.includes(item.id)) return;
		this.equipped = { ...this.equipped, [item.type]: item.id };
		
		const fns = getFns();
		const saveFn = httpsCall(fns, 'saveActiveLoadout');
		try {
			await saveFn({ loadout: this.equipped });
		} catch (err) {
			console.error('Failed to save loadout:', err);
		}
	}
}
