import { Slide } from '../../types.js';
import { DeckRequest } from './prompts.js';
import { generateWithHuggingFace, isHuggingFaceConfigured } from './huggingface.js';
import { generateWithGemini, isGeminiConfigured } from './gemini.js';

export type AIProvider = 'huggingface' | 'gemini' | 'none';

export function getActiveProvider(): AIProvider {
  if (isHuggingFaceConfigured()) return 'huggingface';
  if (isGeminiConfigured()) return 'gemini';
  return 'none';
}

export function getProviderLabel(): string {
  return getActiveProvider() === 'none' ? 'Not configured' : 'AI';
}

export async function generateDeck(req: DeckRequest): Promise<{ slides: Slide[]; provider: string }> {
  const preferred = process.env.AI_PROVIDER?.toLowerCase();

  if (preferred === 'gemini' && isGeminiConfigured()) {
    return generateWithGemini(req);
  }

  if (isHuggingFaceConfigured()) {
    return generateWithHuggingFace(req);
  }

  if (isGeminiConfigured()) {
    return generateWithGemini(req);
  }

  throw new Error(
    'No AI provider configured. Set HUGGINGFACE_API_TOKEN in .env.local (recommended) or GEMINI_API_KEY'
  );
}
