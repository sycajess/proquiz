export const HF_MODEL = process.env.HUGGINGFACE_MODEL || 'Qwen/Qwen2.5-7B-Instruct';
export const HF_CHAT_URL = process.env.HUGGINGFACE_API_URL || 'https://router.huggingface.co/v1/chat/completions';

export function getHfToken(): string | undefined {
  return process.env.HUGGINGFACE_API_TOKEN || process.env.HF_TOKEN;
}

export function getGeminiKey(): string | undefined {
  return process.env.GEMINI_API_KEY;
}
