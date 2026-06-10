import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractJsonArray, normalizeSlides } from './parseSlides.js';

describe('parseSlides', () => {
  it('extracts JSON from code fence', () => {
    const raw = extractJsonArray('```json\n[{"type":"qa","question":"Ask?"}]\n```');
    assert.equal(raw.length, 1);
  });

  it('normalizes quiz slide', () => {
    const slides = normalizeSlides([{
      type: 'quiz',
      question: 'Test?',
      options: ['A', 'B', 'C', 'D'],
      correctOptionIndex: 1,
      timeLimit: 20,
    }]);
    assert.equal(slides[0].type, 'quiz');
    assert.equal((slides[0] as any).correctOptionIndex, 1);
  });

  it('uses title when question missing', () => {
    const slides = normalizeSlides([{ type: 'content', title: 'Welcome!' }]);
    assert.equal(slides[0].question, 'Welcome!');
  });

  it('reclassifies content slides that include poll options', () => {
    const slides = normalizeSlides([{
      type: 'content',
      question: 'What year did Ghana gain independence?',
      options: ['1957', '1960', '1945', '1970'],
      correctOptionIndex: 0,
      timeLimit: 20,
    }]);
    assert.equal(slides[0].type, 'quiz');
  });
});
