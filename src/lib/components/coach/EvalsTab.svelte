<script>
	import { db, auth } from '$lib/firebase.js';
	import {
		addDoc,
		collection,
		doc,
		getDocs,
		query,
		serverTimestamp,
		setDoc,
		where,
	} from 'firebase/firestore';

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

	/** Roster display name → player_lookup doc id (email lower) */
	let nameToEmail = $state(/** @type {Record<string, string>} */ ({}));

	let proPlayerName = $state('');
	let seasonLabel = $state('');
	let pace = $state(70);
	let stamina = $state(70);
	let strength = $state(70);
	let passing = $state(70);
	let shooting = $state(70);
	let dribbling = $state(70);
	let defending = $state(70);
	let publishBusy = $state(false);
	let publishMsg = $state('');

	function slugSeasonDocId(label) {
		const s = String(label)
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '_')
			.replace(/^_|_$/g, '')
			.slice(0, 80);
		return s || `season_${Date.now()}`;
	}

	function clampMetric(n) {
		const x = Math.round(Number(n));
		if (!Number.isFinite(x)) return 0;
		return Math.min(100, Math.max(0, x));
	}

	$effect(() => {
		if (!teamId) {
			nameToEmail = {};
			return;
		}
		getDocs(query(collection(db, 'player_lookup'), where('teamId', '==', teamId)))
			.then((snap) => {
				const m = {};
				snap.forEach((d) => {
					const data = d.data();
					const pn = data.playerName;
					if (typeof pn === 'string' && pn.trim()) {
						m[pn.trim()] = d.id;
					}
				});
				nameToEmail = m;
			})
			.catch((e) => console.error(e));
	});

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
			timestamp: new Date(),
		});
		alert('Evaluation Saved!');
		evalPlayerSel = '';
		evalSkillSel = '';
		evalScore = 3;
		evalNotes = '';
	};

	const submitCoachTrial = async () => {
		if (!coachTrialPlayer || !coachTrialSkill || !coachA1) {
			return alert('Fill required fields.');
		}
		const prefix = coachTrialType === 'Passing' ? 'pass' : coachTrialType === 'Shooting' ? 'shot' : 'time';
		const total =
			coachTrialType === 'Time' ?
				Math.min(
					...[parseFloat(coachA1), parseFloat(coachA2), parseFloat(coachA3)].filter((t) => t > 0),
				) + 's' :
				(parseFloat(coachA1) || 0) + (parseFloat(coachA2) || 0) + (parseFloat(coachA3) || 0);
		await addDoc(collection(db, 'trials'), {
			player: coachTrialPlayer,
			teamId,
			type: coachTrialType,
			skill: coachTrialSkill,
			a1: coachA1,
			a2: coachA2 || 0,
			a3: coachA3 || 0,
			result: String(total),
			isCoach: true,
			timestamp: new Date(),
		});
		alert('Official Trial Saved!');
		coachTrialPlayer = '';
		coachTrialSkill = '';
		coachA1 = '';
		coachA2 = '';
		coachA3 = '';
	};

	async function publishVerifiedMetrics() {
		publishMsg = '';
		if (!teamId) {
			publishMsg = 'Select a team first.';
			return;
		}
		if (!proPlayerName.trim()) {
			publishMsg = 'Select a player.';
			return;
		}
		const sl = seasonLabel.trim();
		if (!sl) {
			publishMsg = 'Enter a season label (e.g. Spring 2026).';
			return;
		}
		const playerKey = nameToEmail[proPlayerName.trim()];
		if (!playerKey) {
			publishMsg =
				'This player needs a roster email link. Add their email on the Roster tab so they appear in player_lookup.';
			return;
		}
		const uid = auth.currentUser?.uid;
		if (!uid) {
			publishMsg = 'You must be signed in.';
			return;
		}

		const seasonId = slugSeasonDocId(sl);
		const physical = {
			pace: clampMetric(pace),
			stamina: clampMetric(stamina),
			strength: clampMetric(strength),
		};
		const technical = {
			passing: clampMetric(passing),
			shooting: clampMetric(shooting),
			dribbling: clampMetric(dribbling),
			defending: clampMetric(defending),
		};

		publishBusy = true;
		try {
			await setDoc(
				doc(db, 'player_metrics', playerKey, 'seasons', seasonId),
				{
					teamId,
					seasonLabel: sl,
					physical,
					technical,
					verifiedBy: uid,
					updatedAt: serverTimestamp(),
				},
				{merge: true},
			);
			publishMsg = 'Pro metrics published and coach-verified.';
			seasonLabel = '';
		} catch (e) {
			console.error(e);
			publishMsg = e?.message || 'Could not save metrics. Check permissions and Firestore rules.';
		} finally {
			publishBusy = false;
		}
	}
</script>

<div class="evals-tab">
	<div class="bento-section evals-bento">
		<div class="card evals-pro-card">
			<div class="card-header evals-pro-head">Pro player card — verified metrics</div>
			<div class="card-body evals-pro-body">
				{#if !teamId}
					<p class="evals-hint">Select a team to publish verified scouting metrics.</p>
				{:else}
					<p class="evals-hint">
						Scores are saved to the player’s longitudinal profile and stamped with your coach
						verification. The player must have an email linked on the roster.
					</p>

					<div class="evals-pro-grid">
						<div class="evals-field-group">
							<label class="evals-label" for="evals-pro-player">Player</label>
							<select
								id="evals-pro-player"
								class="evals-input"
								bind:value={proPlayerName}
							>
								<option value="">— Select player —</option>
								{#each players as p}
									<option value={p}>{p}</option>
								{/each}
							</select>
						</div>
						<div class="evals-field-group">
							<label class="evals-label" for="evals-season-label">Season label</label>
							<input
								id="evals-season-label"
								class="evals-input"
								type="text"
								bind:value={seasonLabel}
								placeholder='e.g. "Spring 2026"'
								maxlength="120"
							/>
						</div>
					</div>

					<div class="evals-metrics-bento">
						<div class="card evals-metric-card">
							<div class="evals-metric-title">Physical (0–100)</div>
							<div class="evals-slider-row">
								<label class="evals-slider-label" for="evals-pace">Pace</label>
								<input
									id="evals-pace"
									type="range"
									min="0"
									max="100"
									bind:value={pace}
								/>
								<span class="evals-val">{clampMetric(pace)}</span>
							</div>
							<div class="evals-slider-row">
								<label class="evals-slider-label" for="evals-stamina">Stamina</label>
								<input
									id="evals-stamina"
									type="range"
									min="0"
									max="100"
									bind:value={stamina}
								/>
								<span class="evals-val">{clampMetric(stamina)}</span>
							</div>
							<div class="evals-slider-row">
								<label class="evals-slider-label" for="evals-strength">Strength</label>
								<input
									id="evals-strength"
									type="range"
									min="0"
									max="100"
									bind:value={strength}
								/>
								<span class="evals-val">{clampMetric(strength)}</span>
							</div>
						</div>

						<div class="card evals-metric-card">
							<div class="evals-metric-title">Technical (0–100)</div>
							<div class="evals-slider-row">
								<label class="evals-slider-label" for="evals-passing">Passing</label>
								<input
									id="evals-passing"
									type="range"
									min="0"
									max="100"
									bind:value={passing}
								/>
								<span class="evals-val">{clampMetric(passing)}</span>
							</div>
							<div class="evals-slider-row">
								<label class="evals-slider-label" for="evals-shooting">Shooting</label>
								<input
									id="evals-shooting"
									type="range"
									min="0"
									max="100"
									bind:value={shooting}
								/>
								<span class="evals-val">{clampMetric(shooting)}</span>
							</div>
							<div class="evals-slider-row">
								<label class="evals-slider-label" for="evals-dribbling">Dribbling</label>
								<input
									id="evals-dribbling"
									type="range"
									min="0"
									max="100"
									bind:value={dribbling}
								/>
								<span class="evals-val">{clampMetric(dribbling)}</span>
							</div>
							<div class="evals-slider-row">
								<label class="evals-slider-label" for="evals-defending">Defending</label>
								<input
									id="evals-defending"
									type="range"
									min="0"
									max="100"
									bind:value={defending}
								/>
								<span class="evals-val">{clampMetric(defending)}</span>
							</div>
						</div>
					</div>

					<button
						type="button"
						class="primary-btn btn-gold evals-publish-btn"
						disabled={publishBusy}
						onclick={publishVerifiedMetrics}
					>
						{publishBusy ? 'Publishing…' : 'Publish & verify signature'}
					</button>
					{#if publishMsg}
						<p
							class="evals-publish-msg"
							class:evals-publish-msg--ok={publishMsg.includes('published')}
							role="status"
						>
							{publishMsg}
						</p>
					{/if}
				{/if}
			</div>
		</div>

		<div class="card">
			<div class="card-header bg-red-header">Recent trial submissions</div>
			<div class="card-body p-0">
				<ul class="session-list">
					{#each trials as t}
						<li class="session-item">
							<div class="flex-1">
								<b>{t.player}</b>
								<span class="text-sm-sub">
									({t.timestamp ? new Date(t.timestamp.seconds * 1000).toLocaleDateString() : ''})</span
								><br />
								<span class="text-accent-orange">{t.type}:</span>
								{t.skill}
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
			<div class="card-header bg-blue-header">Submit player evaluation</div>
			<div class="card-body">
				<select bind:value={evalPlayerSel}>
					<option value="" disabled>Select Player...</option>
					{#each players as p}<option value={p}>{p}</option>{/each}
				</select>
				<select bind:value={evalSkillSel}>
					<option value="" disabled>Select Skill...</option>
					{#each workouts as w}<option value={w.name}>{w.name}</option>{/each}
				</select>
				<label for="evals-skill-score">Score: {evalScore} / 5</label>
				<input
					id="evals-skill-score"
					type="range"
					min="1"
					max="5"
					bind:value={evalScore}
					class="score-range"
				/>
				<textarea bind:value={evalNotes} rows="2" placeholder="Optional coaching notes..."></textarea>
				<button class="primary-btn btn-blue w-100" onclick={submitEval}>Submit Evaluation</button>
			</div>
		</div>
	</div>
</div>

<style>
	.evals-tab {
		width: 100%;
		box-sizing: border-box;
	}

	.evals-bento {
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
		gap: clamp(16px, 3vw, 24px);
	}

	.evals-pro-card {
		grid-column: 1 / -1;
		padding: var(--spacing-fluid);
		border-radius: var(--radius-premium);
		margin-bottom: 0;
	}

	.evals-pro-head {
		padding-bottom: clamp(12px, 2vw, 16px);
		margin-bottom: clamp(12px, 2vw, 16px);
	}

	.evals-pro-body {
		padding-top: 0;
	}

	.evals-hint {
		margin: 0 0 clamp(14px, 2.5vw, 18px);
		font-size: clamp(0.88rem, 2.5vw, 0.95rem);
		color: var(--text-secondary);
		font-weight: 600;
		line-height: 1.55;
	}

	.evals-pro-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
		gap: clamp(12px, 2.5vw, 16px);
		margin-bottom: clamp(16px, 3vw, 20px);
	}

	.evals-field-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.evals-label {
		font-size: 0.78rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-secondary);
	}

	.evals-input {
		width: 100%;
		box-sizing: border-box;
		padding: clamp(10px, 2vw, 12px) clamp(12px, 2vw, 14px);
		border-radius: var(--radius-premium);
		border: 1px solid var(--input-border);
		background: var(--input-bg);
		font: inherit;
		margin: 0;
	}

	.evals-metrics-bento {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
		gap: clamp(14px, 2.5vw, 18px);
		margin-bottom: clamp(16px, 3vw, 20px);
	}

	.evals-metric-card {
		margin-bottom: 0;
		padding: clamp(14px, 2.5vw, var(--spacing-fluid));
		border-radius: var(--radius-premium);
		background: var(--glass-bg);
		-webkit-backdrop-filter: blur(18px) saturate(160%);
		backdrop-filter: blur(18px) saturate(160%);
		border: 1px solid var(--glass-border);
		box-shadow: var(--shadow-premium);
	}

	.evals-metric-title {
		font-weight: 900;
		font-size: 0.9rem;
		margin-bottom: clamp(12px, 2vw, 14px);
		color: var(--text-primary);
	}

	.evals-slider-row {
		display: grid;
		grid-template-columns: 88px 1fr 36px;
		align-items: center;
		gap: 10px;
		margin-bottom: 10px;
	}

	.evals-slider-label {
		font-size: 0.82rem;
		font-weight: 700;
		color: var(--text-secondary);
		margin: 0;
	}

	.evals-slider-row input[type='range'] {
		width: 100%;
		margin: 0;
		padding: 0;
		cursor: pointer;
	}

	.evals-val {
		font-weight: 900;
		font-size: 0.85rem;
		text-align: right;
		color: var(--aggie-blue);
	}

	.evals-publish-btn {
		width: 100%;
		margin: 0;
		border-radius: var(--radius-premium);
		padding: clamp(12px, 2.5vw, 14px);
	}

	.evals-publish-msg {
		margin: clamp(12px, 2vw, 14px) 0 0;
		font-weight: 700;
		font-size: 0.9rem;
		color: var(--danger-red);
	}

	.evals-publish-msg--ok {
		color: var(--success-green);
	}

	select,
	input,
	textarea {
		margin-bottom: 10px;
	}
	.evals-pro-body select,
	.evals-pro-body input,
	.evals-pro-body textarea {
		margin-bottom: 0;
	}
	.card-body > select:last-of-type,
	.card-body > input:not(.evals-input):last-of-type {
		margin-bottom: 10px;
	}

	.score-range {
		padding: 0;
		margin-bottom: 12px;
		cursor: pointer;
	}
	.text-right {
		text-align: right;
	}
	.input-row {
		display: flex;
		gap: 10px;
	}
</style>
