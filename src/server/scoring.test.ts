import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateQuizPoints } from './scoring.js';

describe('quiz scoring', () => {
  it('returns 0 for wrong answer', () => {
    assert.equal(calculateQuizPoints(false, 1000, 20), 0);
  });

  it('returns max points for instant correct answer', () => {
    assert.equal(calculateQuizPoints(true, 0, 20), 1000);
  });

  it('returns min 400 at time limit', () => {
    assert.equal(calculateQuizPoints(true, 20000, 20), 400);
  });
});
