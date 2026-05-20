import { describe, expect, it } from 'vitest';
import { actionTone, prettyAction, relativeTime } from '$lib/admin/overviewFeed.js';

describe('overviewFeed', () => {
	it('actionTone maps security verbs to bands', () => {
		expect(actionTone('GRANT_ACCESS')).toBe('success');
		expect(actionTone('REVOKE_TOKEN')).toBe('danger');
		expect(actionTone('BG_CHECK_PENDING')).toBe('warn');
		expect(actionTone('INFO_EVENT')).toBe('info');
	});

	it('prettyAction humanizes snake_case actions', () => {
		expect(prettyAction('GRANT_ACCESS')).toBe('Grant Access');
	});

	it('relativeTime formats recent timestamps', () => {
		const now = new Date();
		expect(relativeTime(now)).toMatch(/s ago$/);
		expect(relativeTime(null)).toBe('—');
	});
});
