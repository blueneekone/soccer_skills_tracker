import { db } from '$lib/firebase.js';
import { authStore } from '$lib/stores/auth.svelte.js';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import Swal from 'sweetalert2';
import { designerTypeToAttributeId } from '$lib/coach/teamDrillLibrary.js';

export class DrillDesignerEngine {
	teamId: string = '';
	onDrillSaved: () => void = () => {};
	
	workoutType = $state('ball_mastery');
	workoutName = $state('');
	workoutDuration = $state(15);
	workoutDesc = $state('');

	savedTeamDrills = $state<Array<{ id: string, title: string, attributeId?: string }>>([]);
	loadingSaved = $state(false);

	spatialCanvas: any = null;

	setTeamId(id: string) {
		this.teamId = id;
	}

	setOnDrillSaved(callback: () => void) {
		this.onDrillSaved = callback;
	}

	async saveWorkout() {
		if (!this.workoutName.trim()) {
			alert('Drill name is required.');
			return;
		}
		if (!this.teamId) {
			alert('Select a team first.');
			return;
		}
		const uid = authStore.user?.uid;
		if (!uid) {
			alert('Sign in to save drills.');
			return;
		}
		
		let layoutData = null;
		if (this.spatialCanvas && this.spatialCanvas.getObjects().length > 0) {
			layoutData = JSON.stringify(this.spatialCanvas.toJSON());
		}
		
		const attributeId = designerTypeToAttributeId(this.workoutType);
		const focusLabel =
			this.workoutType === 'ball_mastery' ? 'Ball Mastery'
			: this.workoutType === 'cardio' ? 'Conditioning'
			: this.workoutType === 'core' ? 'Conditioning'
			: this.workoutType === 'gameday' ? 'Tactics'
			: 'Ball Mastery';
			
		const durationMinutes = Math.max(
			1,
			Math.min(120, Math.floor(Number(this.workoutDuration) || 15)),
		);
		
		try {
			await addDoc(collection(db, 'teams', this.teamId, 'drills'), {
				name: this.workoutName.trim(),
				title: this.workoutName.trim(),
				focusArea: focusLabel,
				category: focusLabel,
				attributeId,
				metricType: 'reps',
				description: this.workoutDesc.trim().slice(0, 8000) || `${focusLabel} spatial drill`,
				durationMinutes,
				spatialLayout: layoutData,
				scope: 'team',
				createdBy: uid,
				createdAt: serverTimestamp(),
			});
			await Swal.fire({
				title: 'Drill saved',
				text: 'Available in your team library and Intent Engine deploy picker.',
				icon: 'success',
				confirmButtonColor: '#0f172a',
				customClass: { popup: 'card' },
			});
			
			this.workoutName = '';
			this.workoutDesc = '';
			this.workoutDuration = 15;
			if (this.spatialCanvas) this.spatialCanvas.clear();
			
			this.onDrillSaved();
			this.loadSavedDrills();
		} catch (err) {
			alert('Error: ' + (err instanceof Error ? err.message : String(err)));
		}
	}

	async loadSavedDrills() {
		const tid = this.teamId;
		if (!tid) {
			this.savedTeamDrills = [];
			return;
		}
		this.loadingSaved = true;
		try {
			const snap = await getDocs(collection(db, 'teams', tid, 'drills'));
			this.savedTeamDrills = snap.docs
				.map((d) => {
					const x = d.data() || {};
					return {
						id: d.id,
						title:
							typeof x.name === 'string' && x.name.trim() ?
								x.name.trim()
							: typeof x.title === 'string' ?
								x.title
							:	'Untitled',
						attributeId:
							typeof x.attributeId === 'string' ? x.attributeId : undefined,
					};
				})
				.sort((a, b) => a.title.localeCompare(b.title));
		} catch (e) {
			console.error('[DrillDesignerEngine] load team drills', e);
			this.savedTeamDrills = [];
		} finally {
			this.loadingSaved = false;
		}
	}

	subscribe() {
		$effect.root(() => {
			$effect(() => {
				const tid = this.teamId;
				if (tid) {
					this.loadSavedDrills();
				} else {
					this.savedTeamDrills = [];
				}
			});
			return () => {};
		});
	}
}
