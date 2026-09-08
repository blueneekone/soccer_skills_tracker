import { describe, expect, it } from 'vitest';
import { isDefaultCell, resolveCellId, DEFAULT_CELL_ID } from '../cells.js';

describe('cells type definitions and helpers', () => {
	describe('resolveCellId', () => {
		it('resolves explicit default cell id', () => {
			expect(resolveCellId(DEFAULT_CELL_ID)).toBe(DEFAULT_CELL_ID);
			expect(resolveCellId('default')).toBe(DEFAULT_CELL_ID);
		});

		it('resolves empty or whitespace inputs to default', () => {
			expect(resolveCellId('')).toBe(DEFAULT_CELL_ID);
			expect(resolveCellId('   ')).toBe(DEFAULT_CELL_ID);
			expect(resolveCellId('\t\n')).toBe(DEFAULT_CELL_ID);
		});

		it('resolves non-string inputs to default', () => {
			expect(resolveCellId(null)).toBe(DEFAULT_CELL_ID);
			expect(resolveCellId(undefined)).toBe(DEFAULT_CELL_ID);
			expect(resolveCellId(123)).toBe(DEFAULT_CELL_ID);
			expect(resolveCellId({})).toBe(DEFAULT_CELL_ID);
		});

		it('trims and preserves valid dedicated cell IDs', () => {
			expect(resolveCellId('cell-use1-001')).toBe('cell-use1-001');
			expect(resolveCellId('  cell-use1-002  ')).toBe('cell-use1-002');
		});
	});

	describe('isDefaultCell', () => {
		it('returns true for exact default cell match', () => {
			expect(isDefaultCell(DEFAULT_CELL_ID)).toBe(true);
		});

		it('returns true for literal "default" and whitespace', () => {
			expect(isDefaultCell('default')).toBe(true);
			expect(isDefaultCell('')).toBe(true);
			expect(isDefaultCell('  ')).toBe(true);
		});

		it('returns true for padded strings', () => {
			expect(isDefaultCell(`  ${DEFAULT_CELL_ID}  `)).toBe(true);
			expect(isDefaultCell('  default  ')).toBe(true);
			expect(isDefaultCell('\t(default)\n')).toBe(true);
		});

		it('returns true for non-string runtime inputs', () => {
			// Using type coercion any to verify runtime safety behavior
			expect(isDefaultCell(null as any)).toBe(true);
			expect(isDefaultCell(undefined as any)).toBe(true);
			expect(isDefaultCell(123 as any)).toBe(true);
			expect(isDefaultCell({} as any)).toBe(true);
		});

		it('returns false for dedicated cell IDs', () => {
			expect(isDefaultCell('cell-use1-001')).toBe(false);
			expect(isDefaultCell('cell-usc1-042')).toBe(false);
		});
	});
});
