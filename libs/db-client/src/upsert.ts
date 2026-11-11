import type { Expression } from 'kysely';

// Rows per INSERT, so one statement stays well under pg's 65535 parameter cap.
export const CHUNK_SIZE = 1000;

export function chunk<T>(items: T[], size = CHUNK_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

// The columns an upsert overwrites on conflict: every column the rows carry
// except the key. All rows in a call must carry the same columns.
export function updatableColumns(
  row: object,
  keyColumns: readonly string[],
): string[] {
  return Object.keys(row).filter((column) => !keyColumns.includes(column));
}

// doUpdateSet argument that sets each column to the value being inserted.
export function setFromExcluded(columns: string[]) {
  return (eb: { ref(column: string): Expression<unknown> }) =>
    Object.fromEntries(columns.map((c) => [c, eb.ref(`excluded.${c}`)]));
}
