import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { filterText, filterWords } from '../src/server/moderation.ts';

describe('moderation', () => {
  it('filters banned words', () => {
    assert.equal(filterText('what the hell'), 'what the ***');
  });

  it('filters word list', () => {
    assert.deepEqual(filterWords(['hello', 'damn']), ['hello', '***']);
  });
});
