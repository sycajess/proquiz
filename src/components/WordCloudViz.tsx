import React from 'react';
import { Cloud } from 'lucide-react';
import { layoutWordCloud } from '../server/wordCloudLayout';

interface WordCloudVizProps {
  items: { word: string; count: number }[];
}

export default function WordCloudViz({ items }: WordCloudVizProps) {
  const placed = layoutWordCloud(items);

  if (placed.length === 0) {
    return (
      <div className="text-center text-slate-400 py-10 space-y-2">
        <Cloud className="h-10 w-10 mx-auto opacity-30" />
        <p className="text-xs font-semibold">No entries yet</p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto h-[280px] bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-3xl border border-slate-200 overflow-hidden">
      {placed.map((w) => (
        <span
          key={w.word}
          className="absolute font-bold select-none transition-transform hover:scale-110"
          style={{
            left: w.x,
            top: w.y,
            fontSize: w.fontSize,
            color: w.color,
            transform: `rotate(${w.rotate}deg)`,
          }}
          title={`${w.count} votes`}
        >
          {w.word}
        </span>
      ))}
    </div>
  );
}
