const fs = require('fs');
let code = fs.readFileSync('src/lib/components/shell/PlayerActivityStreak.svelte', 'utf8');

code = code.replace(/const psRef = doc\(db, 'player_stats', uid\);[\s\S]*?unsubAlert\(\);\n\t\t};\n\t}\);/m, `
		return untrack(() => {
			const psRef = doc(db, 'player_stats', uid);

			const unsubPS = onSnapshot(
				psRef,
				(snap) => {
					loading = false;
					if (!snap.exists()) {
						streakDays = 0;
						streakStatus = 'active';
						return;
					}
					const d = snap.data();
					streakDays         = Math.floor(Number(d.streak_days) || 0);
					streakStatus       = (d.streakStatus as 'active' | 'frozen' | 'broken') || 'active';
					gracePeriodEndsUtc = typeof d.gracePeriodEndsUtc === 'string' ? d.gracePeriodEndsUtc : '';
				},
				(e) => {
					console.error('[PlayerActivityStreak] player_stats', e);
					loading = false;
				},
			);

			// Subscribe to the latest un-acknowledged alert for this player.
			const alertQ = query(
				collection(db, 'reengagement_alerts'),
				where('uid', '==', uid),
				where('acknowledgedAt', '==', null),
				orderBy('createdAt', 'desc'),
				limit(1),
			);
			const unsubAlert = onSnapshot(
				alertQ,
				(snap) => {
					if (snap.empty) {
						activeAlert = null;
						alertDocId  = '';
						return;
					}
					const docSnap = snap.docs[0];
					activeAlert = docSnap.data() as ReengagementAlertDoc;
					alertDocId  = docSnap.id;
					// Acknowledge on first render (HUD view counts as "seen").
					acknowledgeAlert(docSnap.id);
				},
				() => { activeAlert = null; },
			);

			return () => {
				unsubPS();
				unsubAlert();
			};
		});
	});`);

fs.writeFileSync('src/lib/components/shell/PlayerActivityStreak.svelte', code);
