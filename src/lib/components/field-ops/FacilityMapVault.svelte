<script lang="ts">
	import { FacilityMapVaultEngine } from './FacilityMapVaultEngine.svelte.js';
	import FacilityMapVaultArena from './FacilityMapVaultArena.svelte';
	import FacilityMapVaultHUD from './FacilityMapVaultHUD.svelte';
	import '$lib/styles/enterprise-console.css';

	let { clubId = '', canManage = false, embedded = false } = $props();

	const engine = new FacilityMapVaultEngine(clubId, canManage);
	engine.init();

	// Keep clubId and canManage reactive if they change
	$effect(() => {
		engine.clubId = clubId;
		engine.canManage = canManage;
	});
</script>

<div class="fm-vault" class:fm-vault--embedded={embedded}>
	<FacilityMapVaultHUD {engine} />
	<FacilityMapVaultArena {engine} {embedded} />
</div>

<style>
	.fm-vault {
		width: 100%;
		max-width: 1400px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.fm-vault--embedded {
		height: 100%;
		max-width: none;
		margin: 0;
		padding: 0;
		gap: 16px;
	}

	:global(.fm-vault--embedded .fm-panel--hero-in-page) {
		display: none;
	}

	.fm-panel {
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 6px;
		padding: 20px;
		position: relative;
		overflow: hidden;
	}

	.fm-panel--registry {
		border-top: 3px solid #14b8a6;
	}

	.fm-panel--embedded-map {
		border-top: 3px solid #3b82f6;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.fm-panel__title {
		margin: 0 0 8px 0;
		font-family: var(--font-switzer);
		font-weight: 700;
		font-size: 1.15rem;
		color: #f8fafc;
		letter-spacing: -0.01em;
	}

	.fm-panel__hint {
		margin: 0 0 20px 0;
		font-family: var(--font-switzer);
		font-size: 0.9rem;
		color: #94a3b8;
		line-height: 1.5;
		max-width: 800px;
	}

	.fm-panel__hint--vault {
		margin-bottom: 14px;
	}

	.fm-inline-code {
		font-family: var(--font-mono);
		font-size: 0.85em;
		background: rgba(255, 255, 255, 0.1);
		padding: 2px 4px;
		border-radius: 4px;
		color: #e2e8f0;
	}

	.fm-registry__grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 16px;
		align-items: flex-end;
	}

	.fm-registry__field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.fm-registry__field--wide {
		grid-column: 1 / -1;
	}

	.fm-registry__coord {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.fm-label {
		font-family: var(--font-switzer);
		font-size: 0.8rem;
		font-weight: 600;
		color: #cbd5e1;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.fm-label--coord {
		color: #94a3b8;
	}

	.fm-input {
		width: 100%;
		background: #1e293b;
		border: 1px solid #475569;
		border-radius: 4px;
		color: #f8fafc;
		font-family: var(--font-switzer);
		font-size: 0.95rem;
		padding: clamp(4px, 1vw, 8px) 12px;
		transition: border-color 0.15s, box-shadow 0.15s;
		box-sizing: border-box;
	}

	.fm-input:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
	}

	.fm-input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.fm-input--coord {
		font-family: var(--font-mono);
	}

	.fm-registry__actions {
		grid-column: 1 / -1;
		display: flex;
		justify-content: flex-end;
		margin-top: clamp(2px, 0.5vw, 4px);
	}

	.fm-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		background: #1e293b;
		border: 1px solid #475569;
		color: #f8fafc;
		font-family: var(--font-switzer);
		font-weight: 600;
		font-size: 0.9rem;
		padding: clamp(4px, 1vw, 8px) 16px;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.15s;
		white-space: nowrap;
	}

	.fm-btn:hover:not(:disabled) {
		background: #334155;
		border-color: #64748b;
	}

	.fm-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.fm-btn--primary {
		background: #14b8a6;
		border-color: #0d9488;
		color: #000;
	}

	.fm-btn--primary:hover:not(:disabled) {
		background: #0d9488;
		border-color: #0f766e;
	}

	.fm-btn--secondary {
		background: transparent;
		border-color: #64748b;
		color: #e2e8f0;
	}

	.fm-btn--secondary:hover:not(:disabled) {
		background: #334155;
		border-color: #94a3b8;
	}

	.fm-btn--danger {
		background: rgba(239, 68, 68, 0.1);
		border-color: rgba(239, 68, 68, 0.3);
		color: #ef4444;
	}

	.fm-btn--danger:hover:not(:disabled) {
		background: rgba(239, 68, 68, 0.2);
		border-color: rgba(239, 68, 68, 0.5);
	}

	.fm-btn--sm {
		padding: clamp(2px, 0.5vw, 4px) 10px;
		font-size: 0.8rem;
	}

	.fm-err {
		margin: 12px 0 0 0;
		color: #ef4444;
		font-size: 0.85rem;
		font-family: var(--font-switzer);
	}

	.fm-lightning-hint {
		margin: 0 0 4px 0;
		font-size: 0.8rem;
		color: #f59e0b;
	}

	

	

	

	

	

	

	

	

	

	

	

	

	

	

	

	

	

	

	

	

	

	

	

	

	

	

	

	

	

	

	

	

	

	

	.fm-vault--embedded .fm-panel--vault-wide {
		flex: 1 1 auto;
		min-height: 0;
		overflow-y: auto;
		align-content: start;
		width: 100%;
		max-width: none;
	}

	.fm-panel--vault-wide {
		width: 100%;
		max-width: none;
		box-sizing: border-box;
	}

	

	

	
</style>
