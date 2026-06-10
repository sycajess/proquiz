import { HF_CHAT_URL, HF_MODEL, getHfToken } from './constants.js';
import { buildSystemPrompt, buildUserPrompt, DeckRequest } from './prompts.js';
import { extractJsonArray, normalizeSlides } from './parseSlides.js';
import { Slide } from '../../types.js';

interface ChatResponse {
  choices?: { message?: { content?: string } }[];
  error?: string;
}

export function isHuggingFaceConfigured(): boolean {
  return !!getHfToken();
}

export async function generateWithHuggingFace(req: DeckRequest): Promise<{ slides: Slide[]; provider: string }> {
  const token = getHfToken();
  if (!token) {
    throw new Error('HUGGINGFACE_API_TOKEN not set. Add your token to .env.local');
  }

  const modelId = HF_MODEL;

  const res = await fetch(HF_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: buildUserPrompt(req) },
      ],
      max_tokens: 4096,
      temperature: 0.7,
    }),
  });

  const data = (await res.json()) as ChatResponse;

  if (!res.ok) {
    const msg = (data as any)?.error?.message || (data as any)?.error || res.statusText;
    throw new Error(`Hugging Face API error (${res.status}): ${msg}`);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from Hugging Face');

  const parsed = extractJsonArray(content);
  const slides = normalizeSlides(parsed);

  return { slides, provider: `huggingface:${modelId}` };
}
