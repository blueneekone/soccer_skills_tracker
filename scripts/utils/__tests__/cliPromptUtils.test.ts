import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as readline from 'node:readline/promises';
import { formatDocForDisplay, promptUserForWinner } from '../cliPromptUtils.js';

vi.mock('node:readline/promises');

describe('cliPromptUtils', () => {
	const mockRow1 = { id: 'doc1', data: { name: 'Alice' }, email: 'test@example.com', uid: null };
	const mockRow2 = { id: 'doc2', data: { name: 'Bob' }, email: 'test@example.com', uid: 'uid123' };
	const list = [mockRow1, mockRow2];

	beforeEach(() => {
		vi.resetAllMocks();
		// Mock console.log to keep test output clean
		vi.spyOn(console, 'log').mockImplementation(() => {});
	});

	describe('formatDocForDisplay', () => {
		it('formats document correctly', () => {
			const formatted = formatDocForDisplay(mockRow1, 0);
			expect(formatted).toContain('[1] ID: doc1');
			expect(formatted).toContain('UID Field: (unset)');
			expect(formatted).toContain('"name": "Alice"');
		});

		it('formats document with UID correctly', () => {
			const formatted = formatDocForDisplay(mockRow2, 1);
			expect(formatted).toContain('[2] ID: doc2');
			expect(formatted).toContain('UID Field: uid123');
			expect(formatted).toContain('"name": "Bob"');
		});
	});

	describe('promptUserForWinner', () => {
		it('returns selected document when valid number is entered', async () => {
			const mockQuestion = vi.fn().mockResolvedValue('1');
			readline.createInterface = vi.fn().mockReturnValue({
				question: mockQuestion,
				close: vi.fn(),
			});

			const result = await promptUserForWinner('test@example.com', list);
			expect(result).toEqual(mockRow1);
			expect(mockQuestion).toHaveBeenCalledTimes(1);
		});

		it('returns null when user skips', async () => {
			const mockQuestion = vi.fn().mockResolvedValue('s');
			readline.createInterface = vi.fn().mockReturnValue({
				question: mockQuestion,
				close: vi.fn(),
			});

			const result = await promptUserForWinner('test@example.com', list);
			expect(result).toBeNull();
			expect(mockQuestion).toHaveBeenCalledTimes(1);
		});

		it('prompts again if input is invalid initially', async () => {
			const mockQuestion = vi.fn()
				.mockResolvedValueOnce('invalid')
				.mockResolvedValueOnce('3')
				.mockResolvedValueOnce('2');

			readline.createInterface = vi.fn().mockReturnValue({
				question: mockQuestion,
				close: vi.fn(),
			});

			const result = await promptUserForWinner('test@example.com', list);
			expect(result).toEqual(mockRow2);
			expect(mockQuestion).toHaveBeenCalledTimes(3);
		});
	});
});
