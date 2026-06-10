export function uniqueNickname(existing: string[], requested: string): string {
  const taken = new Set(existing.map((n) => n.toLowerCase()));
  const base = requested.trim() || 'Explorer';
  if (!taken.has(base.toLowerCase())) return base;
  let i = 2;
  while (taken.has(`${base} (${i})`.toLowerCase())) i++;
  return `${base} (${i})`;
}
