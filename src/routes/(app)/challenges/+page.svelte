<script>
	import { db } from '$lib/firebase.js';
	import { collection, addDoc } from 'firebase/firestore';
	import { authStore } from '$lib/stores/auth.svelte.js';

	const profile = $derived(authStore.userProfile);

	// Passing
	let passSkillName = $state('');
	let passScore1 = $state('');
	let passScore2 = $state('');
	let passScore3 = $state('');
	const passTotal = $derived(
		(parseFloat(passScore1) || 0) + (parseFloat(passScore2) || 0) + (parseFloat(passScore3) || 0)
	);

	// Shooting
	let shotSkillName = $state('');
	let shotScore1 = $state('');
	let shotScore2 = $state('');
	let shotScore3 = $state('');
	const shotTotal = $derived(
		(parseFloat(shotScore1) || 0) + (parseFloat(shotScore2) || 0) + (parseFloat(shotScore3) || 0)
	);

	// Time Trial
	let timeSkillName = $state('');
	let timeScore1 = $state('');
	let timeScore2 = $state('');
	let timeScore3 = $state('');
	const timeTotal = $derived(() => {
		const times = [parseFloat(timeScore1), parseFloat(timeScore2), parseFloat(timeScore3)].filter((t) => t > 0);
		return times.length > 0 ? Math.min(...times) + 's' : '0s';
	});

	const submitTrial = async (type) => {
		const prefix = type === 'Passing' ? 'pass' : type === 'Shooting' ? 'shot' : 'time';
		const skill = type === 'Passing' ? passSkillName : type === 'Shooting' ? shotSkillName : timeSkillName;
		const a1 = type === 'Passing' ? passScore1 : type === 'Shooting' ? shotScore1 : timeScore1;
		const a2 = type === 'Passing' ? passScore2 : type === 'Shooting' ? shotScore2 : timeScore2;
		const a3 = type === 'Passing' ? passScore3 : type === 'Shooting' ? shotScore3 : timeScore3;
		const result = type === 'Passing' ? passTotal : type === 'Shooting' ? shotTotal : timeTotal();

		if (!skill || !a1) return alert(`Please enter the skill name and at least Score 1 for your ${type} trial.`);
		if (!profile?.playerName || !profile?.teamId) return alert('Profile incomplete.');

		try {
			await addDoc(collection(db, 'trials'), {
				player: profile.playerName,
				teamId: profile.teamId,
				type,
				skill,
				a1, a2: a2 || 0, a3: a3 || 0,
				result: String(result),
				timestamp: new Date()
			});
			alert(`${type} Trial Saved! Your coach has been notified.`);
			// Clear form
			if (type === 'Passing') { passSkillName = ''; passScore1 = ''; passScore2 = ''; passScore3 = ''; }
			else if (type === 'Shooting') { shotSkillName = ''; shotScore1 = ''; shotScore2 = ''; shotScore3 = ''; }
			else { timeSkillName = ''; timeScore1 = ''; timeScore2 = ''; timeScore3 = ''; }
		} catch (e) {
			alert('Error saving trial: ' + e.message);
		}
	};
</script>

<div class="view-section">
	<div class="card-header bg-gold-header">
		<h2 class="challenge-header">🔥 Challenge Mode</h2>
		<p class="challenge-subtitle">Watch the video, perform the reps, and log your official score.</p>
	</div>

	<!-- Passing Points -->
	<div class="card flush-top">
		<div class="card-header bg-blue-header">1. Passing Points</div>
		<div class="card-body">
			<iframe
				class="video-frame"
				src="https://www.youtube.com/embed/QytqZ-zieSc"
				frameborder="0"
				allowfullscreen
				title="Challenge Video 1 - Passing Points"
			></iframe>
			<input type="text" placeholder="Skill/Action Name (e.g. 1v1 Take On)" bind:value={passSkillName} />
			<div class="input-row">
				<input type="number" bind:value={passScore1} placeholder="Score 1" class="flex-1" />
				<input type="number" bind:value={passScore2} placeholder="Score 2" class="flex-1" />
				<input type="number" bind:value={passScore3} placeholder="Score 3" class="flex-1" />
			</div>
			<div class="score-display-box">
				<span class="score-label">Total Passing Score</span>
				<span class="score-value score-blue">{passTotal}</span>
			</div>
			<button class="primary-btn btn-blue" onclick={() => submitTrial('Passing')}>Submit Passing Score</button>
		</div>
	</div>

	<!-- Shot Scoring -->
	<div class="card">
		<div class="card-header bg-orange-header">2. Shot Scoring</div>
		<div class="card-body">
			<iframe
				class="video-frame"
				src="https://www.youtube.com/embed/p-75lxTdksg"
				frameborder="0"
				allowfullscreen
				title="Challenge Video 2 - Shot Scoring"
			></iframe>
			<input type="text" placeholder="Skill/Action Name" bind:value={shotSkillName} />
			<div class="input-row">
				<input type="number" bind:value={shotScore1} placeholder="Score 1" class="flex-1" />
				<input type="number" bind:value={shotScore2} placeholder="Score 2" class="flex-1" />
				<input type="number" bind:value={shotScore3} placeholder="Score 3" class="flex-1" />
			</div>
			<div class="score-display-box">
				<span class="score-label">Total Shot Score</span>
				<span class="score-value score-orange">{shotTotal}</span>
			</div>
			<button class="primary-btn btn-orange" onclick={() => submitTrial('Shooting')}>Submit Shot Score</button>
		</div>
	</div>

	<!-- Time Trial -->
	<div class="card">
		<div class="card-header bg-green-header">3. Time Trial</div>
		<div class="card-body">
			<iframe
				class="video-frame"
				src="https://www.youtube.com/embed/u51A9mWPBXo"
				frameborder="0"
				allowfullscreen
				title="Challenge Video 3 - Time Trial"
			></iframe>
			<input type="text" placeholder="Skill/Action Name" bind:value={timeSkillName} />
			<div class="input-row">
				<input type="number" bind:value={timeScore1} placeholder="Time 1 (s)" class="flex-1" />
				<input type="number" bind:value={timeScore2} placeholder="Time 2 (s)" class="flex-1" />
				<input type="number" bind:value={timeScore3} placeholder="Time 3 (s)" class="flex-1" />
			</div>
			<div class="score-display-box">
				<span class="score-label">Best Time</span>
				<span class="score-value score-green">{timeTotal()}</span>
			</div>
			<button class="primary-btn btn-green" onclick={() => submitTrial('Time')}>Submit Best Time</button>
		</div>
	</div>
</div>

<style>
	.challenge-header {
		margin: 0;
	}
	.challenge-subtitle {
		margin: 4px 0 0;
		font-size: 0.9rem;
		opacity: 0.85;
	}
	input {
		margin-bottom: 12px;
	}
	.primary-btn {
		width: 100%;
	}
</style>
