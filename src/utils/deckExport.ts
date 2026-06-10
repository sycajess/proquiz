import { Slide } from '../types';

export function exportDeck(slides: Slide[], filename = 'proquiz-deck.json') {
  const blob = new Blob([JSON.stringify({ version: 1, slides }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function importDeck(file: File): Promise<Slide[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        const slides = data.slides || data;
        if (!Array.isArray(slides) || slides.length === 0) {
          reject(new Error('Invalid deck file'));
          return;
        }
        const formatted = slides.map((s: any, i: number) => ({
          id: s.id || `imported_${Date.now()}_${i}`,
          ...s
        }));
        resolve(formatted);
      } catch {
        reject(new Error('Could not parse deck file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export function exportSessionResults(data: object, roomCode: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `proquiz-results-${roomCode}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadCsv(roomCode: string) {
  const a = document.createElement('a');
  a.href = `/api/rooms/${roomCode}/export.csv`;
  a.download = `proquiz-${roomCode}.csv`;
  a.click();
}
