import { PersistedRoom } from './store.js';

export function sessionToCsv(data: PersistedRoom): string {
  const rows: string[][] = [['slide', 'type', 'question', 'participant', 'response', 'score']];

  data.session.slides.forEach((slide, idx) => {
    const responses = data.responses[idx] || [];
    if (responses.length === 0) {
      rows.push([String(idx + 1), slide.type, esc(slide.question), '', '', '']);
      return;
    }
    responses.forEach((r) => {
      const p = data.participants.find((x) => x.id === r.payload.participantId);
      rows.push([
        String(idx + 1),
        slide.type,
        esc(slide.question),
        esc(p?.nickname || r.payload.participantId),
        esc(formatResponse(r)),
        String(p?.score ?? ''),
      ]);
    });
  });

  rows.push([]);
  rows.push(['leaderboard', '', '', '', '', '']);
  [...data.participants].sort((a, b) => b.score - a.score).forEach((p, i) => {
    rows.push(['', 'rank', String(i + 1), esc(p.nickname), esc(p.avatar), String(p.score)]);
  });

  return rows.map((r) => r.join(',')).join('\n');
}

function esc(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function formatResponse(r: any): string {
  if (r.type === 'multiple_choice' || r.type === 'quiz') return `option ${r.payload.optionIndex}`;
  if (r.type === 'word_cloud') return (r.payload.words || []).join(' ');
  if (r.type === 'qa') return r.payload.text;
  if (r.type === 'rating_scale') return JSON.stringify(r.payload.ratings);
  return '';
}
