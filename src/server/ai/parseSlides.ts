import { Slide, SlideType } from '../../types.js';

const TYPE_MAP: Record<string, SlideType> = {
  multiple_choice: 'multiple_choice',
  poll: 'multiple_choice',
  opinion_poll: 'multiple_choice',
  quiz: 'quiz',
  trivia: 'quiz',
  word_cloud: 'word_cloud',
  wordcloud: 'word_cloud',
  rating_scale: 'rating_scale',
  rating: 'rating_scale',
  ratings: 'rating_scale',
  qa: 'qa',
  q_and_a: 'qa',
  question: 'qa',
  open_question: 'qa',
  content: 'content',
  title: 'content',
  intro: 'content',
  instruction: 'content',
};

function normalizeType(raw: unknown): SlideType | null {
  const key = String(raw || '').toLowerCase().replace(/[\s-]+/g, '_');
  return TYPE_MAP[key] || (key as SlideType in TYPE_MAP ? (key as SlideType) : null);
}

function getQuestion(item: any, index: number): string {
  const q = item.question || item.title || item.prompt || item.text || item.header;
  if (q && String(q).trim()) return String(q).trim();
  if (item.type === 'content' && item.bullets?.[0]) return String(item.bullets[0]);
  return `Question ${index + 1}`;
}

export function extractJsonArray(text: string): unknown[] {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return JSON.parse(fenced[1].trim());

  const start = trimmed.indexOf('[');
  const end = trimmed.lastIndexOf(']');
  if (start !== -1 && end > start) return JSON.parse(trimmed.slice(start, end + 1));

  const objStart = trimmed.indexOf('{');
  const objEnd = trimmed.lastIndexOf('}');
  if (objStart !== -1 && objEnd > objStart) {
    const obj = JSON.parse(trimmed.slice(objStart, objEnd + 1));
    if (Array.isArray(obj.slides)) return obj.slides;
  }

  return JSON.parse(trimmed);
}

export function normalizeSlides(raw: unknown[]): Slide[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('AI returned no slides');
  }

  const slides: Slide[] = [];

  raw.forEach((item: any, i: number) => {
    const type = normalizeType(item.type);
    if (!type) return;

    const question = getQuestion(item, i);
    const base = {
      id: `slide_${Date.now()}_${i}`,
      type,
      question,
    };

    switch (type) {
      case 'multiple_choice':
        slides.push({ ...base, type: 'multiple_choice', options: item.options?.slice(0, 6) || ['Option A', 'Option B', 'Option C', 'Option D'] });
        break;
      case 'quiz':
        slides.push({
          ...base,
          type: 'quiz',
          options: item.options?.slice(0, 4) || ['A', 'B', 'C', 'D'],
          correctOptionIndex: Math.min(3, Math.max(0, item.correctOptionIndex ?? item.correct_index ?? 0)),
          timeLimit: item.timeLimit || item.time_limit || 20,
          explanation: item.explanation || '',
        });
        break;
      case 'word_cloud':
        slides.push({ ...base, type: 'word_cloud' });
        break;
      case 'qa':
        slides.push({ ...base, type: 'qa' });
        break;
      case 'rating_scale':
        slides.push({
          ...base,
          type: 'rating_scale',
          scaleStatements: item.scaleStatements || item.statements || item.scale_statements || ['Quality', 'Engagement'],
        });
        break;
      case 'content': {
        const hasOptions = Array.isArray(item.options) && item.options.length >= 2;
        if (hasOptions) {
          const hasCorrect =
            item.correctOptionIndex !== undefined ||
            item.correct_index !== undefined ||
            item.timeLimit !== undefined ||
            item.time_limit !== undefined;
          if (hasCorrect) {
            slides.push({
              ...base,
              type: 'quiz',
              options: item.options.slice(0, 4),
              correctOptionIndex: Math.min(3, Math.max(0, item.correctOptionIndex ?? item.correct_index ?? 0)),
              timeLimit: item.timeLimit || item.time_limit || 20,
              explanation: item.explanation || '',
            });
          } else {
            slides.push({
              ...base,
              type: 'multiple_choice',
              options: item.options.slice(0, 6),
            });
          }
          break;
        }
        slides.push({
          ...base,
          type: 'content',
          title: item.title || question,
          subtitle: item.subtitle || '',
          bullets: item.bullets || [],
          imageUrl: item.imageUrl || item.image_url,
        });
        break;
      }
    }
  });

  if (slides.length === 0) throw new Error('AI returned no valid slides');
  return slides;
}
