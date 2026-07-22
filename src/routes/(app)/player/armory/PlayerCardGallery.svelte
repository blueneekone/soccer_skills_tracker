<script lang="ts">
	import PlayerCard from '$lib/components/player/PlayerCard.svelte';

	// Static manifest of processed avatars — Vite resolves these at build time
	const avatarModules = import.meta.glob(
		'/src/assets/avatars/processed/*.{jpg,jpeg,png,webp}',
		{ eager: true, query: '?url', import: 'default' }
	) as Record<string, string>;

	const AVATAR_ENTRIES = Object.entries(avatarModules).map(([path, url]) => {
		const filename = path.split('/').pop()?.replace(/\.[^.]+$/, '') ?? 'OPERATIVE';
		const displayName = filename.replace(/_\d{18}(_\d+)?$/, '').replace(/_/g, ' ').toUpperCase();
		return { url, displayName };
	});

	const POSITIONS = ['FWD', 'MID', 'DEF', 'GK', 'FWD', 'MID', 'DEF', 'FWD', 'MID', 'DEF', 'FWD', 'MID', 'DEF', 'GK', 'FWD', 'MID', 'DEF', 'FWD', 'MID', 'DEF', 'GK'];
	const RANKS    = ['Recruit', 'Cadet', 'Operative', 'Specialist', 'Elite', 'Vanguard', 'Operative', 'Cadet', 'Specialist', 'Elite', 'Recruit', 'Operative', 'Vanguard', 'Cadet', 'Elite', 'Specialist', 'Recruit', 'Vanguard', 'Operative', 'Cadet', 'Specialist'];
	const VARIANTS: Array<'base' | 'holo' | 'radiant'> = ['base','holo','base','radiant','base','holo','base','base','radiant','base','holo','base','base','radiant','base','holo','base','base','radiant','base','holo'];

	function randomStats(seed: number): number[] {
		return [0,1,2,3,4,5].map(i => Math.min(99, Math.max(50, Math.round(55 + ((seed * 17 + i * 31) % 42)))));
	}

	const cards = AVATAR_ENTRIES.map((entry, i) => ({
		...entry,
		position: POSITIONS[i % POSITIONS.length],
		rankName: RANKS[i % RANKS.length],
		variant: VARIANTS[i % VARIANTS.length],
		stats: randomStats(i + 7),
	}));

	let filter = $state<'all' | 'base' | 'holo' | 'radiant'>('all');
	const visibleCards = $derived(filter === 'all' ? cards : cards.filter(c => c.variant === filter));
</script>

<div class="gallery-shell">
	<!-- Header HUD -->
	<div class="gallery-hud">
		<div class="hud-label">OPERATIVE FIELD DOSSIERS</div>
		<div class="hud-count">{visibleCards.length} / {cards.length} OPERATIVES</div>
	</div>

	<!-- Filter rail -->
	<div class="filter-rail" role="tablist" aria-label="Card variant filter">
		{#each (['all','base','holo','radiant'] as const) as f}
			<button
				class="filter-btn"
				class:active={filter === f}
				onclick={() => filter = f}
				role="tab"
				aria-selected={filter === f}
			>
				{f.toUpperCase()}
			</button>
		{/each}
	</div>

	<!-- Bento Grid — anti-squish fluid math per nexus-command-ui §4 -->
	<div class="card-grid">
		{#each visibleCards as card, i (card.url)}
			<div class="card-cell">
				<PlayerCard
					avatarSrc={card.url}
					playerName={card.displayName.split(' ').slice(0,2).join(' ')}
					position={card.position}
					rankName={card.rankName}
					clubName="SSTracker FC"
					stats={card.stats}
					variant={card.variant}
				/>
			</div>
		{/each}
	</div>
</div>

<style>
	.gallery-shell {
		width: 100%;
		padding: clamp(16px, 3vw, 32px);
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.gallery-hud {
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1px solid #1e293b;
		padding-bottom: 12px;
	}

	.hud-label {
		font-family: 'Geist Mono', monospace;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.3em;
		color: #14b8a6;
		text-transform: uppercase;
	}

	.hud-count {
		font-family: 'Geist Mono', monospace;
		font-size: 10px;
		letter-spacing: 0.2em;
		color: #475569;
	}

	.filter-rail {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.filter-btn {
		font-family: 'Geist Mono', monospace;
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.2em;
		padding: 6px 14px;
		background: transparent;
		border: 1px solid #334155;
		color: #64748b;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.filter-btn:hover { border-color: #14b8a6; color: #14b8a6; }
	.filter-btn.active {
		background: #14b8a6;
		border-color: #14b8a6;
		color: #020617;
	}

	.card-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, clamp(220px, 22vw, 280px)), 1fr));
		gap: clamp(20px, 3vw, 32px);
		justify-items: center;
	}

	.card-cell {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 0;
	}
</style>
