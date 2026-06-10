import { HF_CHAT_URL, getHfModelId, getHfToken } from './constants.js';

export async function suggestTone(topic: string): Promise<string> {
  const token = getHfToken();
  if (!token) throw new Error('AI not configured');

  const res = await fetch(HF_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: getHfModelId(),
      messages: [
        {
          role: 'system',
          content: 'You suggest presentation tones. Reply with only a short tone label (2-4 words), nothing else.',
        },
        {
          role: 'user',
          content: `Suggest the best presentation tone for a live quiz/poll deck about: "${topic}"`,
        },
      ],
      max_tokens: 30,
      temperature: 0.8,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as any)?.error?.message || 'Tone suggestion failed');
  }

  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('No tone suggestion returned');
  return text.replace(/^["']|["']$/g, '').slice(0, 40);
}
