/**
 * vaultOps.test.js — Sprint 2.2 vault crypto unit tests (pure helpers)
 */

const {describe, it} = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

function wrapDek(masterKey, dek) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv);
  const enc = Buffer.concat([cipher.update(dek), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {wrapped: enc.toString('base64'), iv: iv.toString('base64'), tag: tag.toString('base64')};
}

function unwrapDek(masterKey, wrapped) {
  const iv = Buffer.from(wrapped.iv, 'base64');
  const tag = Buffer.from(wrapped.tag, 'base64');
  const data = Buffer.from(wrapped.wrapped, 'base64');
  const decipher = crypto.createDecipheriv(ALGORITHM, masterKey, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

function encryptField(dek, plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, dek, iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {iv: iv.toString('base64'), tag: tag.toString('base64'), data: enc.toString('base64')};
}

function decryptField(dek, blob) {
  const iv = Buffer.from(blob.iv, 'base64');
  const tag = Buffer.from(blob.tag, 'base64');
  const data = Buffer.from(blob.data, 'base64');
  const decipher = crypto.createDecipheriv(ALGORITHM, dek, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

describe('vaultOps crypto envelope', () => {
  it('round-trips DEK wrap and field encrypt/decrypt', () => {
    const masterKey = crypto.randomBytes(32);
    const dek = crypto.randomBytes(32);
    const wrapped = wrapDek(masterKey, dek);
    const unwrapped = unwrapDek(masterKey, wrapped);
    assert.equal(unwrapped.toString('hex'), dek.toString('hex'));

    const blob = encryptField(unwrapped, 'Test Player');
    const plain = decryptField(unwrapped, blob);
    assert.equal(plain, 'Test Player');
  });
});
