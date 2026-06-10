import { HF_CHAT_URL, getHfModelId, getHfToken } from './constants.js';

export async function suggestShareMessage(topic: string, joinUrl: string, roomCode: string): Promise<string> {
  const token = getHfToken();
  const fallback = `Hey! Join my live quiz session.\n\nOpen: ${joinUrl}\nRoom code: ${roomCode}`;

  if (!token) return fallback;

  try {
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
            content: 'Write a short friendly invite message (2-3 sentences) for a live quiz/poll session. End with the join link and room code on separate lines. No markdown.',
          },
          {
            role: 'user',
            content: `Topic: "${topic}"\nJoin URL: ${joinUrl}\nRoom code: ${roomCode}`,
          },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    const data = await res.json();
    if (!res.ok) return fallback;
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return fallback;
    if (!text.includes(roomCode)) return `${text}\n\nJoin: ${joinUrl}\nCode: ${roomCode}`;
    return text;
  } catch {
    return fallback;
  }
}
