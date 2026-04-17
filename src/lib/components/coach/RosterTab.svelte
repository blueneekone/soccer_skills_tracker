<script>
	import { db } from '$lib/firebase.js';
	import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

	let { teamId = '', teams = [] } = $props();

	let players = $state([]);
	let playerStats = $state({});
	let jerseys = $state({});
	let linkedPlayers = $state(new Set());
	let loading = $state(false);
	let addName = $state('');
	let addEmail = $state('');
	let addJersey = $state('');
	let totalReps = $state(0);

	const loadRoster = async () => {
		if (!teamId) return;
		loading = true;
		try {
			const [statsSnap, rosterSnap, linkSnap] = await Promise.all([
				getDocs(query(collection(db, 'player_stats'), where('teamId', '==', teamId))),
				getDoc(doc(db, 'rosters', teamId)),
				getDocs(query(collection(db, 'player_lookup'), where('teamId', '==', teamId)))
			]);

			playerStats = {};
			statsSnap.forEach((d) => { playerStats[d.id] = d.data(); });

			const rosterNames = rosterSnap.exists() ? (rosterSnap.data().players || []) : [];
			jerseys = rosterSnap.exists() ? (rosterSnap.data().jerseys || {}) : {};

			linkedPlayers = new Set();
			linkSnap.forEach((d) => linkedPlayers.add(d.data().playerName));

			const combined = new Set([...rosterNames, ...Object.keys(playerStats)]);
			players = Array.from(combined).sort();
			totalReps = players.reduce((s, p) => s + (playerStats[p]?.totalMins || 0), 0);
		} catch (e) { console.error(e); }
		finally { loading = false; }
	};

	$effect(() => { if (teamId) loadRoster(); });

	const addPlayer = async () => {
		if (!addName.trim()) return alert('Enter name');
		const ref = doc(db, 'rosters', teamId);
		const snap = await getDoc(ref);
		const list = snap.exists() ? snap.data().players || [] : [];
		const j = snap.exists() ? snap.data().jerseys || {} : {};
		if (!list.includes(addName)) list.push(addName);
		if (addJersey) j[addName] = addJersey;
		await setDoc(ref, { players: list, jerseys: j }, { merge: true });
		if (addEmail) await setDoc(doc(db, 'player_lookup', addEmail.toLowerCase()), { teamId, playerName: addName });
		addName = ''; addEmail = ''; addJersey = '';
		loadRoster();
	};

	const removePlayer = async (name) => {
		if (!confirm(`Remove ${name}?`)) return;
		const ref = doc(db, 'rosters', teamId);
		const snap = await getDoc(ref);
		if (snap.exists()) {
			await updateDoc(ref, { players: snap.data().players.filter((p) => p !== name) });
			loadRoster();
		}
	};
</script>

<div class="roster-tab">
	<div class="card">
		<div class="card-header roster-overview-header">Roster Overview</div>
		<div class="card-body">
			<div class="roster-stats-box">
				<div class="text-center"><b>Active Players</b><br /><span class="roster-stat-val active">{players.length}</span></div>
				<div class="text-center"><b>Total Minutes</b><br /><span class="roster-stat-val reps">{totalReps}</span></div>
			</div>

			<label>Manual Add Player</label>
			<div class="input-row">
				<input type="text" bind:value={addName} placeholder="Player Name" class="flex-1" />
				<input type="number" bind:value={addJersey} placeholder="#" class="w-50" />
			</div>
			<input type="email" bind:value={addEmail} placeholder="Parent Email (Optional)" />
			<button class="secondary-btn w-100" onclick={addPlayer}>+ Add Player</button>
		</div>
	</div>

	<div class="card">
		<div class="card-header">
			<span>Team Roster</span>
			<button class="action-btn" onclick={loadRoster}>↻ Refresh</button>
		</div>
		<div class="card-body p-0">
			{#if loading}
				<div class="session-empty">Loading...</div>
			{:else if players.length === 0}
				<div class="session-empty">No players found.</div>
			{:else}
				{#each players as p}
					<div class="player-row">
						<div>
							<b>{jerseys[p] ? `#${jerseys[p]} ` : ''}{p}</b>
							<div class="text-sm-sub">Last: {playerStats[p]?.lastActive ? playerStats[p].lastActive.toDate?.().toLocaleDateString?.() || 'N/A' : 'Inactive'}</div>
						</div>
						<div class="player-actions">
							<span class="player-mins">{playerStats[p]?.totalMins || 0}m</span>
							{#if linkedPlayers.has(p)}<span class="linked-badge">✔ Linked</span>{/if}
							<button class="delete-btn" onclick={() => removePlayer(p)}>x</button>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</div>
</div>

<style>
	.roster-stats-box {
		display: flex;
		gap: 20px;
		justify-content: space-around;
		padding: 16px;
		background: rgba(15,23,42,0.05);
		border-radius: 12px;
		margin-bottom: 16px;
	}
	.roster-stat-val {
		font-size: 2rem;
		font-weight: 900;
		display: block;
	}
	.roster-stat-val.active { color: var(--success-green); }
	.roster-stat-val.reps { color: var(--aggie-blue); }
	.player-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px var(--spacing-fluid);
		border-bottom: 1px solid rgba(15,23,42,0.05);
	}
	.player-actions { display: flex; align-items: center; gap: 8px; }
	.player-mins { font-size: 0.85rem; font-weight: 700; color: var(--aggie-blue); }
	.linked-badge { background: #dcfce7; color: #166534; border-radius: 4px; padding: 2px 8px; font-size: 0.75rem; font-weight: 800; }
	.delete-btn { background: none; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer; color: var(--danger-red); padding: 2px 8px; font-size: 0.85rem; }
	input { margin-bottom: 10px; }
</style>
