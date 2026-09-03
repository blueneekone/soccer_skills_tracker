import { describe, it, expect } from 'vitest';
import { sanitizeSentryEvent } from '../sentryHelpers';
import type { Event } from '@sentry/sveltekit';

describe('sentryHelpers', () => {
	it('sanitizes PII from Sentry event while preserving system-level debug tags', () => {
		const mockEvent = {
			event_id: '12345',
			tags: {
				browser: 'Chrome',
				component: 'LoginWidget'
			},
			user: {
				id: 'u_789',
				email: 'test@example.com',
				phone: '555-1234'
			},
			extra: {
				address: '123 Main St',
				passport: 'A1234567',
				birthdate: '2010-01-01',
				safeData: 'metadata_here'
			}
		} as unknown as Event;

		const sanitized = sanitizeSentryEvent(mockEvent);

		expect(sanitized.user?.email).toBe('[REDACTED_PII]');
		expect(sanitized.user?.phone).toBe('[REDACTED_PII]');
		expect(sanitized.extra?.address).toBe('[REDACTED_PII]');
		expect(sanitized.extra?.passport).toBe('[REDACTED_PII]');
		expect(sanitized.extra?.birthdate).toBe('[REDACTED_PII]');

		expect(sanitized.event_id).toBe('12345');
		expect(sanitized.tags?.browser).toBe('Chrome');
		expect(sanitized.tags?.component).toBe('LoginWidget');
		expect(sanitized.user?.id).toBe('u_789');
		expect(sanitized.extra?.safeData).toBe('metadata_here');
	});
});
