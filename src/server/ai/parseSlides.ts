import { Slide } from '../../types.js';

export function extractJsonArray(text: string): unknown[] {
  const trimmed = text.trim();

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    return JSON.parse(fenced[1].trim());
  }

  const start = trimmed.indexOf('[');
  const end = trimmed.lastIndexOf(']');
  if (start !== -1 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1));
  }

  return JSON.parse(trimmed);
}

export function normalizeSlides(raw: unknown[]): Slide[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('AI returned no slides');
  }

  return raw.map((item: any, i: number) => {
    const type = item.type;
    if (!type || !item.question) {
      throw new Error(`Slide ${i + 1} missing type or question`);
    }

    const base = {
      id: `slide_${Date.now()}_${i}`,
      type,
      question: String(item.question),
    };

    switch (type) {
      case 'multiple_choice':
        return { ...base, options: item.options?.slice(0, 6) || ['Option A', 'Option B', 'Option C', 'Option D'] };
      case 'quiz':
        return {
          ...base,
          options: item.options?.slice(0, 4) || ['A', 'B', 'C', 'D'],
          correctOptionIndex: Math.min(3, Math.max(0, item.correctOptionIndex ?? 0)),
          timeLimit: item.timeLimit || 20,
          explanation: item.explanation || '',
        };
      case 'word_cloud':
        return base;
      case 'rating_scale':
        return { ...base, scaleStatements: item.scaleStatements?.slice(0, 5) || ['Quality', 'Engagement'] };
      case 'qa':
        return base;
      case 'content':
        return {
          ...base,
          title: item.title || item.question,
          subtitle: item.subtitle || '',
          bullets: item.bullets || [],
          imageUrl: item.imageUrl,
        };
      default:
        throw new Error(`Unknown slide type: ${type}`);
    }
  }) as Slide[];
}
