const UNITS = ['B', 'KB', 'MB', 'GB'] as const;

/**
 * Human-readable file size using 1024-based units, at most one decimal.
 * 0 -> "0 B", 1536 -> "1.5 KB", 3 * 1024 ** 2 -> "3 MB".
 */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';

  let unit = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    UNITS.length - 1,
  );
  let value = Math.round((bytes / 1024 ** unit) * 10) / 10;

  // 1023.96 KB rounds to 1024 KB; show it as 1 MB instead.
  if (value >= 1024 && unit < UNITS.length - 1) {
    unit += 1;
    value = Math.round((bytes / 1024 ** unit) * 10) / 10;
  }

  return `${value} ${UNITS[unit]}`;
}
