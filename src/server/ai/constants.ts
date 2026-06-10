export const HF_BASE_URL = process.env.HUGGINGFACE_API_URL || 'https://router.huggingface.co/v1';
export const HF_CHAT_URL = `${HF_BASE_URL}/chat/completions`;
export const HF_MODEL_BASE = process.env.HUGGINGFACE_MODEL || 'Qwen/Qwen2.5-7B-Instruct';
export const HF_PROVIDER = process.env.HUGGINGFACE_PROVIDER || 'hyperbolic';

export function getHfModelId(): string {
  if (HF_MODEL_BASE.includes(':')) return HF_MODEL_BASE;
  return HF_PROVIDER ? `${HF_MODEL_BASE}:${HF_PROVIDER}` : HF_MODEL_BASE;
}

export function getHfToken(): string | undefined {
  return process.env.HUGGINGFACE_API_TOKEN || process.env.HF_TOKEN;
}

export function getGeminiKey(): string | undefined {
  return process.env.GEMINI_API_KEY;
}
