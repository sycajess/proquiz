import { GoogleGenAI, Type } from '@google/genai';
import { getGeminiKey } from './constants.js';
import { buildSystemPrompt, buildUserPrompt, DeckRequest } from './prompts.js';
import { normalizeSlides } from './parseSlides.js';
import { Slide } from '../../types.js';

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({ apiKey: getGeminiKey() || 'MOCK_KEY' });
  }
  return client;
}

export function isGeminiConfigured(): boolean {
  return !!getGeminiKey();
}

export async function generateWithGemini(req: DeckRequest): Promise<{ slides: Slide[]; provider: string }> {
  const key = getGeminiKey();
  if (!key) throw new Error('GEMINI_API_KEY not set');

  const response = await getClient().models.generateContent({
    model: 'gemini-3.5-flash',
    contents: buildUserPrompt(req),
    config: {
      systemInstruction: buildSystemPrompt(),
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING },
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctOptionIndex: { type: Type.INTEGER },
            timeLimit: { type: Type.INTEGER },
            scaleStatements: { type: Type.ARRAY, items: { type: Type.STRING } },
            explanation: { type: Type.STRING },
            title: { type: Type.STRING },
            subtitle: { type: Type.STRING },
            bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['type', 'question'],
        },
      },
    },
  });

  const slides = normalizeSlides(JSON.parse(response.text || '[]'));
  return { slides, provider: 'gemini:gemini-3.5-flash' };
}
