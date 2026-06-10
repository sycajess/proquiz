const BANNED = ['damn', 'hell', 'shit', 'fuck', 'ass', 'bitch', 'crap'];

export function filterText(text: string): string {
  let result = text;
  for (const word of BANNED) {
    const re = new RegExp(`\\b${word}\\b`, 'gi');
    result = result.replace(re, '***');
  }
  return result.trim();
}

export function filterWords(words: string[]): string[] {
  return words.map((w) => filterText(w)).filter((w) => w.length > 0);
}
