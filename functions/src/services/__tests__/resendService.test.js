'use strict';

const {describe, it, beforeEach, afterEach} = require('node:test');
const assert = require('node:assert');
const {sendEmail, DEFAULT_FROM} = require('../resendService');

describe('resendService', () => {
	const originalFetch = global.fetch;
	const originalEnv = process.env.RESEND_API_KEY;

	beforeEach(() => {
		process.env.RESEND_API_KEY = 're_test_key_123';
	});

	afterEach(() => {
		global.fetch = originalFetch;
		process.env.RESEND_API_KEY = originalEnv;
	});

	it('returns error when recipient email is empty or invalid', async () => {
		const res = await sendEmail({
			to: '',
			subject: 'Test',
			text: 'Hello',
		});
		assert.strictEqual(res.ok, false);
		assert.strictEqual(res.error, 'No valid recipient emails');
	});

	it('dispatches to Resend API endpoint with default from address', async () => {
		let capturedUrl = '';
		let capturedOpts = null;

		global.fetch = async (url, opts) => {
			capturedUrl = url;
			capturedOpts = opts;
			return {
				ok: true,
				json: async () => ({id: 'msg_resend_999'}),
			};
		};

		const res = await sendEmail({
			to: 'guardian@example.com',
			subject: 'Verify Player Account',
			html: '<p>Click link</p>',
		});

		assert.strictEqual(res.ok, true);
		assert.strictEqual(res.id, 'msg_resend_999');
		assert.strictEqual(capturedUrl, 'https://api.resend.com/emails');

		const body = JSON.parse(capturedOpts.body);
		assert.deepStrictEqual(body.to, ['guardian@example.com']);
		assert.strictEqual(body.from, DEFAULT_FROM);
		assert.strictEqual(body.from, 'SSTracker <noreply@sstracker.app>');
		assert.strictEqual(body.subject, 'Verify Player Account');
		assert.strictEqual(body.html, '<p>Click link</p>');
	});

	it('handles API rejection responses cleanly without throwing', async () => {
		global.fetch = async () => ({
			ok: false,
			status: 422,
			json: async () => ({message: 'Domain not verified'}),
		});

		const res = await sendEmail({
			to: 'test@example.com',
			subject: 'Subject',
			text: 'Text',
		});

		assert.strictEqual(res.ok, false);
		assert.strictEqual(res.error, 'Domain not verified');
	});
});
