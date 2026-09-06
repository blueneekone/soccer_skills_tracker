import { browser } from '$app/environment';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '$lib/firebase.js';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { authStore } from '$lib/stores/auth.svelte.js';
import { writePlayerOsWorkout } from '$lib/stores/playerEngine.svelte.js';
import { calculateWorkoutXp, getLevelProgressFromTotalXp } from '$lib/gamification/level.js';
import Swal from 'sweetalert2';
import { dopamineOnCallable } from '$lib/services/dopamine.svelte.js';
import { loadDrillTitlesForFocus, type WorkoutFocus } from '$lib/player/workout/focusDrillCatalog.js';
import { deriveHudStreak, deriveHudXp, deriveProfileXp, loadLogWorkoutChildSnapshot } from '$lib/parent/logWorkoutChildProfile.js';

export class LogWorkoutEngine {
	children = $state<Array<{ email: string; playerName: string; teamId: string }>>([]);
	childrenLoading = $state(true);
	selectedChildEmail = $state('');
	childProfile = $state<Record<string, unknown> & { email?: string } | null>(null);
	childProfileLoading = $state(false);
	childProfileError = $state('');
	childStatsXp = $state(0);
	childStatsStreak = $state(0);

	selectedFocus = $state<WorkoutFocus>('technical');
	selectedDrill = $state<string | null>(null);
	intensity = $state(5);
	duration = $state(30);
	logSubmitting = $state(false);

	verifierLegalName = $state('');
	parentVerifiedAck = $state(false);

	availableDrills = $state<string[]>([]);
	drillsLoading = $state(false);

	get role() { return authStore.role; }
	get profile() { return authStore.userProfile; }
	get selectedChild() { return this.children.find((c) => c.email === this.selectedChildEmail); }

	get profileXp() { return deriveProfileXp(this.childProfile); }
	get childXp() { return deriveHudXp(this.profileXp, this.childStatsXp); }
	get levelProgress() { return getLevelProgressFromTotalXp(this.childXp); }
	get level() { return this.levelProgress.level; }
	get currentXp() { return this.levelProgress.xpIntoLevel; }
	get nextLevelXp() { return this.levelProgress.xpToNext; }
	
	get profileStreak() { return Math.max(0, Math.floor(Number(this.childProfile?.currentStreak) || 0)); }
	get streak() { return deriveHudStreak(this.profileStreak, this.childStatsStreak); }
	get xpLoadPct() { return this.nextLevelXp > 0 ? Math.min(100, (this.currentXp / this.nextLevelXp) * 100) : 100; }

	intensityApiFromStep(step: number) {
		if (step <= 3) return 'low';
		if (step <= 7) return 'medium';
		return 'high';
	}

	get estimatedLogXp() {
		const dMin = Math.max(0, Math.floor(Number(this.duration) || 0));
		const ir = this.intensityApiFromStep(this.intensity);
		const mult = ir === 'high' ? 1.35 : ir === 'medium' ? 1.15 : 1.0;
		return calculateWorkoutXp({
			totalReps: 0,
			intenseMinutes: dMin,
			sportPayload: {
				gamification: {
					xpPerRep: 2 * mult,
					xpPerIntenseMinute: 10 * mult,
				},
			},
		});
	}

	async loadChildren() {
		if (!browser) return;
		try {
			this.childrenLoading = true;
			const uid = authStore.user?.uid;
			if (!uid) return;
			const q = query(collection(db, 'team_assignments'), where('guardianUids', 'array-contains', uid));
			const snap = await getDocs(q);
			this.children = snap.docs.map(d => {
				const data = d.data();
				return { email: data.playerEmail, playerName: data.playerName || data.playerEmail, teamId: data.teamId };
			});
			if (this.children.length > 0 && !this.selectedChildEmail) {
				this.selectedChildEmail = this.children[0].email;
			}
		} catch (e) {
			console.error('Error loading children', e);
		} finally {
			this.childrenLoading = false;
		}
	}

	async handleChildChange() {
		if (!this.selectedChildEmail || !browser) return;
		this.childProfileLoading = true;
		this.childProfileError = '';
		try {
			const res = await loadLogWorkoutChildSnapshot(db, this.selectedChildEmail);
			this.childProfile = res.profile;
			this.childStatsXp = res.statsXp;
			this.childStatsStreak = res.statsStreak;
		} catch (e: any) {
			this.childProfileError = e.message;
		} finally {
			this.childProfileLoading = false;
		}
	}

	async loadDrills() {
		if (!browser) return;
		this.drillsLoading = true;
		try {
			const teamId = String(this.childProfile?.teamId || this.selectedChild?.teamId || '').trim();
			const titles = await loadDrillTitlesForFocus(db, this.selectedFocus, { teamId });
			this.availableDrills = titles;
		} catch (e) {
			console.error('[parent log-workout] drill catalog', e);
			this.availableDrills = [];
		} finally {
			this.drillsLoading = false;
		}
	}

	async submitWorkout(onSuccess?: () => void) {
		if (!this.selectedChildEmail || !this.parentVerifiedAck || !this.verifierLegalName.trim()) return;
		this.logSubmitting = true;
		try {
			const logTrainingSession = httpsCallable(functions, 'logTrainingSession');
			const payload = {
				playerEmail: this.selectedChildEmail,
				date: new Date().toISOString().split('T')[0],
				workoutType: this.selectedFocus,
				durationMinutes: this.duration,
				intensity: this.intensityApiFromStep(this.intensity),
				drillTitle: this.selectedDrill || undefined,
				verifierName: this.verifierLegalName.trim()
			};
			
			const res = (await dopamineOnCallable(logTrainingSession(payload), { kind: 'drill' })) as any;
			if (res.data?.success) {
				const xp = Number(res.data.xpEarned) || 0;
				if (xp > 0) this.childStatsXp += xp;
				
				writePlayerOsWorkout({
					emailKey: this.selectedChildEmail,
					userUid: String(this.childProfile?.uid || ''),
					teamId: String(this.childProfile?.teamId || ''),
					focus: payload.workoutType,
					drill: payload.drillTitle || '',
					duration: payload.durationMinutes,
					intensityRpe: this.intensity,
					earnedXp: xp
				});

				Swal.fire({
					icon: 'success',
					title: 'Workout Verified',
					text: `Secured ${xp} XP for ${this.selectedChild?.playerName}`,
					background: '#0F172A',
					color: '#14b8a6',
					confirmButtonColor: '#fbbf24'
				});
				if (onSuccess) onSuccess();
			}
		} catch (e: any) {
			Swal.fire({
				icon: 'error',
				title: 'Verification Failed',
				text: e.message,
				background: '#0F172A',
				color: '#f87171'
			});
		} finally {
			this.logSubmitting = false;
		}
	}
}
