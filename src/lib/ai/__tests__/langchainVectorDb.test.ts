import { describe, it, expect } from 'vitest';
import { MockLangChainVectorDB } from '../langchainVectorDb';

describe('RAG AI Assistant (LangChain Mock)', () => {
	it('should return semantic embeddings from elite manuals', async () => {
		const db = new MockLangChainVectorDB();
		const results = await db.semanticSearch('high press');
		expect(results.length).toBeGreaterThan(0);
		expect(results[0].doc).toContain('USSF');
		
		const protocol = await db.generateTrainingProtocol('high press');
		expect(protocol).toContain('Generated Protocol');
	});
});
