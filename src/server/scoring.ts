export function calculateQuizPoints(isCorrect: boolean, elapsedMs: number, maxSeconds: number): number {
  if (!isCorrect) return 0;
  const ratio = Math.max(0, Math.min(1, elapsedMs / 1000 / maxSeconds));
  return Math.round(1000 - 600 * ratio);
}
