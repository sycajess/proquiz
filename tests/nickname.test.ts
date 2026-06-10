import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { uniqueNickname } from '../src/server/nickname.ts';

describe('uniqueNickname', () => {
  it('returns name when available', () => {
    assert.equal(uniqueNickname(['Alice'], 'Bob'), 'Bob');
  });

  it('appends suffix on duplicate', () => {
    assert.equal(uniqueNickname(['Alice'], 'Alice'), 'Alice (2)');
  });

  it('increments suffix', () => {
    assert.equal(uniqueNickname(['Alice', 'Alice (2)'], 'Alice'), 'Alice (3)');
  });
});
