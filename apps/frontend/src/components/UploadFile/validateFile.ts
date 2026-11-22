import {
  REJECT_REASON_FORMAT,
  REJECT_REASON_SIZE,
  type FileRejection,
} from './types';

/**
 * `accept` entries are extensions (".csv", matched case-insensitively against
 * the file name) or MIME types ("text/csv", "text/*"). CSV MIME types vary by
 * OS, so an extension entry never looks at the MIME type.
 */
export function matchesAccept(file: File, accept: string[]): boolean {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  return accept.some((entry) => {
    const rule = entry.trim().toLowerCase();
    if (rule.startsWith('.')) return name.endsWith(rule);
    if (rule.endsWith('/*')) return type.startsWith(rule.slice(0, -1));
    if (rule.includes('/')) return type === rule;
    return false;
  });
}

/** Returns the rejection for a file, or null when it is acceptable. */
export function validateFile(
  file: File,
  accept: string[],
  maxSizeBytes: number,
): FileRejection[] | null {
  if (!matchesAccept(file, accept)) {
    return [{ item: file.name, reason: REJECT_REASON_FORMAT }];
  }
  if (file.size > maxSizeBytes) {
    return [{ item: file.name, reason: REJECT_REASON_SIZE }];
  }
  return null;
}
