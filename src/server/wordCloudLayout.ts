export interface WordCloudItem {
  word: string;
  count: number;
}

export interface PlacedWord {
  word: string;
  count: number;
  x: number;
  y: number;
  fontSize: number;
  rotate: number;
  color: string;
}

const COLORS = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#db2777', '#7c3aed', '#0d9488', '#ea580c'];

export function layoutWordCloud(items: WordCloudItem[], width = 600, height = 320): PlacedWord[] {
  if (items.length === 0) return [];

  const sorted = [...items].sort((a, b) => b.count - a.count);
  const maxCount = sorted[0].count || 1;
  const placed: PlacedWord[] = [];
  const cx = width / 2;
  const cy = height / 2;

  sorted.forEach((item, i) => {
    const fontSize = 14 + Math.round((item.count / maxCount) * 28);
    const angle = i * 0.85;
    const radius = i === 0 ? 0 : 28 + i * 22;
    const x = cx + Math.cos(angle) * radius - fontSize * item.word.length * 0.18;
    const y = cy + Math.sin(angle) * radius * 0.65 - fontSize * 0.3;
    placed.push({
      word: item.word,
      count: item.count,
      x: Math.max(8, Math.min(width - 80, x)),
      y: Math.max(8, Math.min(height - 36, y)),
      fontSize,
      rotate: i === 0 ? 0 : (i % 2 === 0 ? -12 : 12),
      color: COLORS[i % COLORS.length],
    });
  });

  return placed;
}
