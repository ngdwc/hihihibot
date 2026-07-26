/** Format VND money */
export function fmt(amount: number): string {
  return amount.toLocaleString('vi-VN') + ' ₫';
}

/** Format remaining cooldown ms to human-readable string */
export function fmtTime(ms: number): string {
  const totalSecs = Math.ceil(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}g`);
  if (m > 0) parts.push(`${m}p`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);
  return parts.join(' ');
}

/** Weighted random selection */
export function weightedRandom<T extends { chance: number }>(items: T[]): T {
  const total = items.reduce((sum, i) => sum + i.chance, 0);
  let rand = Math.random() * total;
  for (const item of items) {
    rand -= item.chance;
    if (rand <= 0) return item;
  }
  return items[items.length - 1];
}

/** Random integer between min and max inclusive */
export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Build a text progress bar */
export function progressBar(current: number, max: number, length = 12): string {
  const filled = Math.round((current / max) * length);
  return '█'.repeat(filled) + '░'.repeat(length - filled);
}
