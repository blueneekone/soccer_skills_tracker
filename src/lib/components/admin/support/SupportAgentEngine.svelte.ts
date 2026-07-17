import { authStore } from '$lib/stores/auth.svelte.js';

export type ChatMessage = {
	id: string;
	role: 'user' | 'agent';
	content: string;
	timestamp: number;
};

export class SupportAgentEngine {
	messages = $state<ChatMessage[]>([]);
	isProcessing = $state(false);
	error = $state('');

	constructor() {
		this.messages = [
			{
				id: 'welcome',
				role: 'agent',
				content: 'Support terminal online. Admin privileges active. How can I assist you or the Director today?',
				timestamp: Date.now()
			}
		];
	}

	async sendMessage(text: string) {
		if (!text.trim() || this.isProcessing) return;

		const userMsg: ChatMessage = {
			id: crypto.randomUUID(),
			role: 'user',
			content: text.trim(),
			timestamp: Date.now()
		};

		this.messages = [...this.messages, userMsg];
		this.isProcessing = true;
		this.error = '';

		try {
			const token = await authStore.user?.getIdToken();
			if (!token) throw new Error('Unauthenticated: Missing ID token.');

			const res = await fetch('/api/support/execute', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`
				},
				body: JSON.stringify({ command: userMsg.content })
			});

			if (!res.ok) {
				const errData = await res.json().catch(() => ({}));
				throw new Error(errData.error || `Command failed with status ${res.status}`);
			}

			const data = await res.json();
			
			const agentMsg: ChatMessage = {
				id: crypto.randomUUID(),
				role: 'agent',
				content: data.reply || 'Command executed successfully.',
				timestamp: Date.now()
			};
			
			this.messages = [...this.messages, agentMsg];
		} catch (err: unknown) {
			this.error = err instanceof Error ? err.message : String(err);
			const errorMsg: ChatMessage = {
				id: crypto.randomUUID(),
				role: 'agent',
				content: `Error: ${this.error}. Please check your command syntax or privileges.`,
				timestamp: Date.now()
			};
			this.messages = [...this.messages, errorMsg];
		} finally {
			this.isProcessing = false;
		}
	}
}
