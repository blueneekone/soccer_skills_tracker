<script lang="ts">
	import type { ForgeEngine } from './ForgeEngine.svelte.js';

	let { engine }: { engine: ForgeEngine } = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			engine.submitPrompt();
		}
	}
</script>

<div class="terminal-window">
	<div class="terminal-history">
		{#if engine.messages.length === 0}
			<div class="terminal-empty">
				> System ready. Awaiting tactical parameters...
			</div>
		{/if}
		{#each engine.messages as msg}
			<div class="message message--{msg.role}">
				<span class="message-prefix">{msg.role === 'user' ? '> CMD:' : '> AI_SYS:'}</span>
				<div class="message-content">{msg.content}</div>
			</div>
		{/each}
		{#if engine.isGenerating}
			<div class="message message--ai loading">
				<span class="message-prefix">> AI_SYS:</span>
				<span class="cursor">_</span> Synthesizing tactical vectors...
			</div>
		{/if}
	</div>
	<div class="terminal-input-area">
		<span class="input-prefix">></span>
		<textarea 
			class="terminal-input" 
			bind:value={engine.prompt} 
			onkeydown={handleKeydown} 
			placeholder="E.g., Generate a 60-minute high-pressing session for U14s..." 
			rows="2" 
			disabled={engine.isGenerating}
		></textarea>
		<button 
			class="btn-execute" 
			onclick={() => engine.submitPrompt()} 
			disabled={engine.isGenerating || !engine.prompt.trim()}
		>
			EXECUTE
		</button>
	</div>
</div>

<style>
	.terminal-window {
		background: rgba(15, 23, 42, 0.8);
		border: 1px solid #334155;
		display: flex;
		flex-direction: column;
		height: 600px;
	}
	.terminal-history {
		flex: 1;
		padding: 24px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.terminal-empty {
		font-family: var(--font-mono, 'Geist Mono', monospace);
		color: #64748b;
		font-size: 0.875rem;
	}
	.message {
		display: flex;
		gap: 12px;
		font-family: var(--font-mono, 'Geist Mono', monospace);
		font-size: 0.875rem;
		line-height: 1.5;
	}
	.message--user { color: #94a3b8; }
	.message--ai { color: #f8fafc; }
	.message-prefix { color: #f59e0b; white-space: nowrap; }
	.message-content { white-space: pre-wrap; }
	.loading { color: #14b8a6; }
	.cursor { animation: blink 1s step-end infinite; }
	@keyframes blink { 50% { opacity: 0; } }
	
	.terminal-input-area {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 16px;
		background: #0f172a;
		border-top: 1px solid #334155;
	}
	.input-prefix {
		font-family: var(--font-mono, 'Geist Mono', monospace);
		color: #14b8a6;
		margin-top: 8px;
	}
	.terminal-input {
		flex: 1;
		background: transparent;
		border: none;
		color: #f8fafc;
		font-family: var(--font-mono, 'Geist Mono', monospace);
		font-size: 0.875rem;
		resize: none;
		outline: none;
		line-height: 1.5;
		padding: 8px 0;
	}
	.terminal-input::placeholder { color: #475569; }
	.btn-execute {
		background: #14b8a6;
		color: #020617;
		font-family: var(--font-mono, 'Geist Mono', monospace);
		font-weight: 700;
		border: none;
		padding: 8px 16px;
		cursor: pointer;
		text-transform: uppercase;
		margin-top: 4px;
	}
	.btn-execute:disabled {
		background: #334155;
		color: #94a3b8;
		cursor: not-allowed;
	}
</style>
