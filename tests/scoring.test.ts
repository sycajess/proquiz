import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calcQuizPoints } from '../src/server/scoring.ts';

describe('quiz scoring', () => {
  it('returns 0 for wrong answer', () => {
    assert.equal(calcQuizPoints(false, 1000, 20), 0);
  });

  it('returns max points for instant correct', () => {
    assert.equal(calcQuizPoints(true, 0, 20), 1000);
  });

  it('returns min 400 at time limit', () => {
    assert.equal(calcQuizPoints(true, 20000, 20), 400);
  });
});
