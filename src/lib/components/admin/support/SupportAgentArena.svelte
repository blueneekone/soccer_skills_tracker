<script lang="ts">
	import { SupportAgentEngine } from './SupportAgentEngine.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';

	let engine = new SupportAgentEngine();
	let input = $state('');
	let chatScrollTarget: HTMLElement;

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (!input.trim() || engine.isProcessing) return;
		void engine.sendMessage(input);
		input = '';
	}

	$effect(() => {
		// Auto-scroll on new messages
		if (engine.messages.length && chatScrollTarget) {
			chatScrollTarget.scrollTop = chatScrollTarget.scrollHeight;
		}
	});
</script>

<div class="sa-arena vanguard-card">
	<div class="sa-header">
		<div class="sa-title-row">
			<Icon name="game.zap" size={24} class="sa-icon-zap" />
			<div>
				<h3 class="sa-title">SUPPORT TERMINAL</h3>
				<p class="sa-subtitle">Direct Chat-to-Data Bridge</p>
			</div>
		</div>
		<span class="sa-status-badge">
			<span class="sa-pulse"></span> ONLINE
		</span>
	</div>

	<div class="sa-chat-window" bind:this={chatScrollTarget}>
		{#each engine.messages as msg (msg.id)}
			<div class="sa-msg-wrapper {msg.role === 'user' ? 'sa-msg-user' : 'sa-msg-agent'}">
				<div class="sa-msg-bubble">
					{msg.content}
				</div>
				<div class="sa-msg-time">
					{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
				</div>
			</div>
		{/each}
		{#if engine.isProcessing}
			<div class="sa-msg-wrapper sa-msg-agent">
				<div class="sa-msg-bubble sa-msg-typing">
					<span class="sa-dot"></span><span class="sa-dot"></span><span class="sa-dot"></span>
				</div>
			</div>
		{/if}
	</div>

	<form class="sa-input-area" onsubmit={handleSubmit}>
		<input 
			type="text" 
			class="sa-input" 
			bind:value={input} 
			placeholder="Enter command (e.g. /sync-roster clubId)..." 
			disabled={engine.isProcessing}
		/>
		<button type="submit" class="sa-btn-send" disabled={!input.trim() || engine.isProcessing} aria-label="Send support command">
			<Icon name="nav.chevron-right" size={20} />
		</button>
	</form>
</div>

<style>
	.sa-arena {
		display: flex;
		flex-direction: column;
		height: 600px;
		max-height: 80vh;
		background: linear-gradient(135deg, rgba(8, 17, 28, 0.78), rgba(2, 6, 12, 0.92));
		backdrop-filter: blur(var(--vanguard-blur, 24px));
		border: 1px solid rgba(16, 185, 129, 0.2);
		border-radius: 12px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
		overflow: hidden;
	}

	.sa-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		background: rgba(0, 0, 0, 0.2);
	}

	.sa-title-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	:global(.sa-icon-zap) {
		color: #10b981;
	}

	.sa-title {
		margin: 0;
		font-family: 'Geist Mono', monospace;
		font-size: 0.9rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		color: #10b981;
	}

	.sa-subtitle {
		margin: 0.25rem 0 0;
		font-family: 'Switzer', sans-serif;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.sa-status-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0.75rem;
		background: rgba(16, 185, 129, 0.1);
		border: 1px solid rgba(16, 185, 129, 0.3);
		border-radius: 999px;
		font-family: 'Geist Mono', monospace;
		font-size: 0.7rem;
		font-weight: 700;
		color: #10b981;
		letter-spacing: 0.05em;
	}

	.sa-pulse {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #10b981;
		box-shadow: 0 0 8px #10b981;
		animation: pulse 2s infinite;
	}

	@keyframes pulse {
		0% { opacity: 1; transform: scale(1); }
		50% { opacity: 0.5; transform: scale(1.2); }
		100% { opacity: 1; transform: scale(1); }
	}

	.sa-chat-window {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.sa-msg-wrapper {
		display: flex;
		flex-direction: column;
		max-width: 80%;
	}

	.sa-msg-user {
		align-self: flex-end;
		align-items: flex-end;
	}

	.sa-msg-agent {
		align-self: flex-start;
		align-items: flex-start;
	}

	.sa-msg-bubble {
		padding: 0.75rem 1rem;
		border-radius: 12px;
		font-family: 'Switzer', sans-serif;
		font-size: 0.95rem;
		line-height: 1.5;
		word-break: break-word;
	}

	.sa-msg-user .sa-msg-bubble {
		background: #10b981;
		color: #022c22;
		border-bottom-right-radius: 4px;
	}

	.sa-msg-agent .sa-msg-bubble {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: #f8fafc;
		border-bottom-left-radius: 4px;
	}

	.sa-msg-typing {
		display: flex;
		gap: 4px;
		align-items: center;
		height: 42px;
	}

	.sa-dot {
		width: 6px;
		height: 6px;
		background: rgba(255, 255, 255, 0.5);
		border-radius: 50%;
		animation: blink 1.4s infinite both;
	}
	.sa-dot:nth-child(1) { animation-delay: 0s; }
	.sa-dot:nth-child(2) { animation-delay: 0.2s; }
	.sa-dot:nth-child(3) { animation-delay: 0.4s; }

	@keyframes blink {
		0% { opacity: 0.2; }
		20% { opacity: 1; }
		100% { opacity: 0.2; }
	}

	.sa-msg-time {
		margin-top: 0.25rem;
		font-family: 'Geist Mono', monospace;
		font-size: 0.65rem;
		color: rgba(255, 255, 255, 0.3);
	}

	.sa-input-area {
		display: flex;
		gap: 0.5rem;
		padding: 1rem 1.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.05);
		background: rgba(0, 0, 0, 0.2);
	}

	.sa-input {
		flex: 1;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		padding: 0.75rem 1rem;
		font-family: 'Geist Mono', monospace;
		font-size: 0.9rem;
		color: #f8fafc;
		transition: border-color 0.2s;
	}

	.sa-input:focus {
		outline: none;
		border-color: #10b981;
		background: rgba(16, 185, 129, 0.05);
	}

	.sa-input::placeholder {
		color: rgba(255, 255, 255, 0.3);
	}

	.sa-btn-send {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		border-radius: 8px;
		background: #10b981;
		color: #022c22;
		border: none;
		cursor: pointer;
		transition: all 0.2s;
	}

	.sa-btn-send:hover:not(:disabled) {
		filter: brightness(1.1);
		transform: translateY(-1px);
	}

	.sa-btn-send:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
