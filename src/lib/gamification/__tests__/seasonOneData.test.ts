import { describe, it, expect } from 'vitest';
import {
	formatVariantLabel,
	normalizeStickerVariant,
	getSeasonOneCardsForSet,
	getSeasonOneCardsByConcept,
	getSeasonOneSetById,
	getSeasonOneCardById,
} from '../seasonOneData.js';

describe('seasonOneData', () => {
	describe('formatVariantLabel', () => {
		it('formats known sticker variants correctly', () => {
			expect(formatVariantLabel('holo')).toBe('Holo');
			expect(formatVariantLabel('radiant')).toBe('Radiant');
			expect(formatVariantLabel('alt-art')).toBe('Alt Art');
			expect(formatVariantLabel('base')).toBe('Base');
		});

		it('falls back to "Base" for unexpected or edge case inputs', () => {
			const unexpectedInputs = [
				'unknown',
				'INVALID',
				'HOLO',
				'RADIANT',
				'Alt-Art',
				' holo ',
				'',
				undefined,
				null,
				0,
				123,
				-1,
				NaN,
				false,
				true,
				{},
				{ variant: 'holo' },
				[],
				['holo'],
				() => 'holo',
				Symbol('holo'),
			];

			for (const input of unexpectedInputs) {
				// @ts-expect-error - testing unexpected runtime inputs
				expect(formatVariantLabel(input)).toBe('Base');
			}
		});
	});

	describe('normalizeStickerVariant', () => {
		it('returns input as-is for valid sticker variants', () => {
			expect(normalizeStickerVariant('base')).toBe('base');
			expect(normalizeStickerVariant('holo')).toBe('holo');
			expect(normalizeStickerVariant('radiant')).toBe('radiant');
			expect(normalizeStickerVariant('alt-art')).toBe('alt-art');
		});

		it('normalizes invalid or unexpected inputs to "base"', () => {
			const unexpectedInputs = [
				'unknown',
				'HOLO',
				'',
				null,
				undefined,
				123,
				false,
				{},
				[],
			];

			for (const input of unexpectedInputs) {
				expect(normalizeStickerVariant(input)).toBe('base');
			}
		});
	});

	describe('getSeasonOneCardsForSet', () => {
		it('returns all cards belonging to the specified set ID', () => {
			const streetKingsCards = getSeasonOneCardsForSet('street_kings');
			expect(streetKingsCards.length).toBeGreaterThan(0);
			expect(streetKingsCards.every((c) => c.setId === 'street_kings')).toBe(true);
		});

		it('returns empty array for non-existent set ID', () => {
			expect(getSeasonOneCardsForSet('non_existent_set')).toEqual([]);
			expect(getSeasonOneCardsForSet('')).toEqual([]);
		});
	});

	describe('getSeasonOneCardsByConcept', () => {
		it('returns cards sharing the concept ID', () => {
			const nutmegCards = getSeasonOneCardsByConcept('the_nutmeg');
			expect(nutmegCards.length).toBeGreaterThan(0);
			expect(nutmegCards.every((c) => c.conceptId === 'the_nutmeg')).toBe(true);
		});

		it('returns empty array for non-existent concept ID', () => {
			expect(getSeasonOneCardsByConcept('unknown_concept')).toEqual([]);
		});
	});

	describe('getSeasonOneSetById', () => {
		it('returns set metadata for a valid set ID', () => {
			const set = getSeasonOneSetById('street_kings');
			expect(set).toBeDefined();
			expect(set?.id).toBe('street_kings');
			expect(set?.title).toBe('The Street Kings');
		});

		it('returns undefined for non-existent set ID', () => {
			expect(getSeasonOneSetById('unknown_set')).toBeUndefined();
		});
	});

	describe('getSeasonOneCardById', () => {
		it('returns specific card by card ID', () => {
			const card = getSeasonOneCardById('card_001_base');
			expect(card).toBeDefined();
			expect(card?.id).toBe('card_001_base');
			expect(card?.conceptId).toBe('the_nutmeg');
		});

		it('returns undefined for non-existent card ID', () => {
			expect(getSeasonOneCardById('invalid_card_id')).toBeUndefined();
		});
	});
});
