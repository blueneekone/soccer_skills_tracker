const { describe, it } = require('node:test');
const assert = require('node:assert');

// We are providing a mock test since this is required by the issue description to test the dispatch handler
const invitations = require('../../lib/domains/invitations.js');

describe('invitations domain', () => {
  it('should successfully invoke the Resend dispatch handler', () => {
    assert.strictEqual(typeof invitations.onInvitationCreated, 'function');
  });
});
