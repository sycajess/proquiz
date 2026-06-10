import React, { useMemo } from 'react';

interface WordItem {
  word: string;
  count: number;
}

const COLORS = [
  'text-indigo-700', 'text-emerald-700', 'text-rose-600', 'text-amber-700',
  'text-sky-700', 'text-purple-700', 'text-teal-700', 'text-pink-600',
];

function fontSize(count: number, max: number): number {
  const min = 14;
  const maxSize = 52;
  if (max <= 1) return 28;
  return min + ((count / max) * (maxSize - min));
}

// Archimedean spiral placement
function placeWords(items: WordItem[], width: number, height: number) {
  const max = Math.max(...items.map((i) => i.count), 1);
  const centerX = width / 2;
  const centerY = height / 2;
  let angle = 0;
  let radius = 0;

  return items.map((item, idx) => {
    const size = fontSize(item.count, max);
    const wordLen = item.word.length;
    const w = size * wordLen * 0.55;
    const h = size * 1.2;
    radius += Math.max(w, h) * 0.35 + 4;
    angle += 0.55 + (idx * 0.08);
    const x = centerX + radius * Math.cos(angle) - w / 2;
    const y = centerY + radius * Math.sin(angle) - h / 2;
    return { ...item, x, y, size, color: COLORS[idx % COLORS.length] };
  });
}

export default function WordCloudLayout({ items }: { items: WordItem[] }) {
  const placed = useMemo(() => placeWords(items, 560, 280), [items]);

  if (items.length === 0) return null;

  return (
    <div className="relative w-full h-[280px] mx-auto select-none">
      {placed.map((item) => (
        <span
          key={item.word}
          className={`absolute font-bold whitespace-nowrap transition-all duration-500 hover:scale-110 ${item.color}`}
          style={{
            left: `${Math.max(0, Math.min(item.x, 480))}px`,
            top: `${Math.max(0, Math.min(item.y, 240))}px`,
            fontSize: `${item.size}px`,
            opacity: 0.85 + (item.count / Math.max(...items.map((i) => i.count), 1)) * 0.15,
          }}
        >
          {item.word}
        </span>
      ))}
    </div>
  );
}
