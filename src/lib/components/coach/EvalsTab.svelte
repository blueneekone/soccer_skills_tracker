<script>
	import { db, auth } from '$lib/firebase.js';
	import { collection, query, where, getDocs, addDoc, doc } from 'firebase/firestore';

	let { teamId = '', players = [], workouts = [] } = $props();

	let trials = $state([]);
	let evalPlayerSel = $state('');
	let evalSkillSel = $state('');
	let evalScore = $state(3);
	let evalNotes = $state('');
	let coachTrialPlayer = $state('');
	let coachTrialType = $state('Passing');
	let coachTrialSkill = $state('');
	let coachA1 = $state('');
	let coachA2 = $state('');
	let coachA3 = $state('');

	$effect(() => {
		if (!teamId) return;
		getDocs(query(collection(db, 'trials'), where('teamId', '==', teamId)))
			.then((snap) => {
				trials = [];
				snap.forEach((d) => trials.push({ id: d.id, ...d.data() }));
				trials.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
				trials = trials.slice(0, 10);
			});
	});

	const submitEval = async () => {
		if (!evalPlayerSel || !evalSkillSel) return alert('Select a player and skill.');
		await addDoc(collection(db, 'evaluations'), {
			player: evalPlayerSel,
			teamId,
			skill: evalSkillSel,
			score: evalScore,
			notes: evalNotes,
			coach: auth.currentUser.email,
			timestamp: new Date()
		});
		alert('Evaluation Saved!');
		evalPlayerSel = ''; evalSkillSel = ''; evalScore = 3; evalNotes = '';
	};

	const submitCoachTrial = async () => {
		if (!coachTrialPlayer || !coachTrialSkill || !coachA1) return alert('Fill required fields.');
		const prefix = coachTrialType === 'Passing' ? 'pass' : coachTrialType === 'Shooting' ? 'shot' : 'time';
		const total = coachTrialType === 'Time'
			? Math.min(...[parseFloat(coachA1), parseFloat(coachA2), parseFloat(coachA3)].filter((t) => t > 0)) + 's'
			: (parseFloat(coachA1) || 0) + (parseFloat(coachA2) || 0) + (parseFloat(coachA3) || 0);
		await addDoc(collection(db, 'trials'), {
			player: coachTrialPlayer, teamId, type: coachTrialType, skill: coachTrialSkill,
			a1: coachA1, a2: coachA2 || 0, a3: coachA3 || 0,
			result: String(total), isCoach: true, timestamp: new Date()
		});
		alert('Official Trial Saved!');
		coachTrialPlayer = ''; coachTrialSkill = ''; coachA1 = ''; coachA2 = ''; coachA3 = '';
	};
</script>

<div class="evals-tab">
	<div class="bento-section">
	<div class="card">
		<div class="card-header bg-red-header">🚨 Recent Trial Submissions</div>
		<div class="card-body p-0">
			<ul class="session-list">
				{#each trials as t}
					<li class="session-item">
						<div class="flex-1">
							<b>{t.player}</b>
							<span class="text-sm-sub"> ({t.timestamp ? new Date(t.timestamp.seconds * 1000).toLocaleDateString() : ''})</span><br />
							<span class="text-accent-orange">{t.type}:</span> {t.skill}
						</div>
						<div class="text-right">
							<span class="text-sm-sub">[{t.a1}, {t.a2}, {t.a3}]</span><br />
							<b>{t.result} {t.isCoach ? '⭐' : ''}</b>
						</div>
					</li>
				{:else}
					<li class="session-empty">No recent trial submissions.</li>
				{/each}
			</ul>
		</div>
	</div>

	<div class="card">
		<div class="card-header bg-gold-header">⏱️ Log Official In-Person Trial</div>
		<div class="card-body">
			<select bind:value={coachTrialPlayer}>
				<option value="" disabled>Select Player...</option>
				{#each players as p}<option value={p}>{p}</option>{/each}
			</select>
			<select bind:value={coachTrialType}>
				<option value="Passing">Passing Points</option>
				<option value="Shooting">Shot Scoring</option>
				<option value="Time">Time Trial</option>
			</select>
			<input type="text" bind:value={coachTrialSkill} placeholder="Skill/Action Name" />
			<div class="input-row">
				<input type="number" bind:value={coachA1} placeholder="Score 1" class="flex-1" />
				<input type="number" bind:value={coachA2} placeholder="Score 2" class="flex-1" />
				<input type="number" bind:value={coachA3} placeholder="Score 3" class="flex-1" />
			</div>
			<button class="primary-btn btn-gold w-100" onclick={submitCoachTrial}>⭐ Log Official Trial</button>
		</div>
	</div>

	<div class="card">
		<div class="card-header bg-blue-header">📋 Submit Player Evaluation</div>
		<div class="card-body">
			<select bind:value={evalPlayerSel}>
				<option value="" disabled>Select Player...</option>
				{#each players as p}<option value={p}>{p}</option>{/each}
			</select>
			<select bind:value={evalSkillSel}>
				<option value="" disabled>Select Skill...</option>
				{#each workouts as w}<option value={w.name}>{w.name}</option>{/each}
			</select>
			<label>Score: {evalScore} / 5</label>
			<input type="range" min="1" max="5" bind:value={evalScore} class="score-range" />
			<textarea bind:value={evalNotes} rows="2" placeholder="Optional coaching notes..."></textarea>
			<button class="primary-btn btn-blue w-100" onclick={submitEval}>Submit Evaluation</button>
		</div>
	</div>
	</div>
</div>

<style>
	select, input, textarea { margin-bottom: 10px; }
	.score-range { padding: 0; margin-bottom: 12px; cursor: pointer; }
	.text-right { text-align: right; }
</style>
