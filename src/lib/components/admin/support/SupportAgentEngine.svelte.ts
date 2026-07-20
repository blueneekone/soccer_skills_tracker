import { authStore } from '$lib/stores/auth.svelte.js';
import { functions } from '$lib/firebase.js';
import { httpsCallable } from 'firebase/functions';

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

			const executeSupportCommand = httpsCallable(functions, 'executeSupportCommand');
			const res = await executeSupportCommand({ command: userMsg.content });

			const data = res.data as { reply?: string; error?: string };

			if (data.error) {
				throw new Error(data.error);
			}

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
