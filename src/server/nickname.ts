export function uniqueNickname(existing: string[], requested: string): string {
  const base = requested.trim() || 'Explorer';
  const taken = new Set(existing.map((n) => n.toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  let i = 2;
  while (taken.has(`${base} (${i})`.toLowerCase())) i++;
  return `${base} (${i})`;
}
