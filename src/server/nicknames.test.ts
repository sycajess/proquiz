import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { uniqueNickname } from './nicknames.js';

describe('uniqueNickname', () => {
  it('keeps unique name', () => {
    assert.equal(uniqueNickname(['Alice'], 'Bob'), 'Bob');
  });

  it('suffixes duplicate', () => {
    assert.equal(uniqueNickname(['Bob'], 'Bob'), 'Bob (2)');
    assert.equal(uniqueNickname(['Bob', 'Bob (2)'], 'Bob'), 'Bob (3)');
  });
});
