export class MockLangChainVectorDB {
	private store: any[] = [];

	constructor() {
		this.store = [
			{ id: 1, doc: 'USSF Elite Coaching Manual: Build from the back.' },
			{ id: 2, doc: 'KNVB Total Football: Dynamic positional switching.' },
		];
	}

	async embedQuery(query: string) {
		return [0.1, 0.2, 0.3]; // mock embedding
	}

	async semanticSearch(query: string) {
		console.log(`[RAG AI] Performing LangChain semantic embedding search for: ${query}`);
		return this.store;
	}

	async generateTrainingProtocol(query: string) {
		const results = await this.semanticSearch(query);
		return `Generated Protocol based on ${results.length} elite manuals. Focus: High intensity transition training.`;
	}
}
