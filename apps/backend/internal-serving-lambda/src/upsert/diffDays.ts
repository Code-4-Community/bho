import type { DbDay } from '@bho/db-client';
import microdiff from 'microdiff';

export interface Change {
  date: string;
  table: 'daily' | 'hourly' | 'scheduled';
  // The date, the hour, or the obsTime.
  key: string;
  type: 'added' | 'removed' | 'changed';
  // Only on a changed value.
  field?: string;
  old?: unknown;
  new?: unknown;
}

// microdiff compares arrays by position, so one missing hour would shift every
// hour after it. Keyed by hour and obsTime, a missing row is just one removal.
// importId is the upload's, not the sheet's: it is the same on both sides.
const keyed = (day: DbDay, importId: number) => ({
  daily: { ...day.daily, importId },
  hourly: Object.fromEntries(day.hourly.map((row) => [row.hour, row])),
  scheduled: Object.fromEntries(day.scheduled.map((row) => [row.obsTime, row])),
});

// What changes when `incoming` replaces `stored` (undefined if not stored yet).
export function diffDays(stored: DbDay | undefined, incoming: DbDay): Change[] {
  const date = incoming.daily.date;
  const next = keyed(incoming, incoming.daily.importId);
  const old = stored
    ? keyed(stored, incoming.daily.importId)
    : { hourly: {}, scheduled: {} };

  return microdiff(old, next).map((d): Change => {
    const [table, key, field] = d.path as [Change['table'], string, string];
    if (table === 'daily') {
      // ['daily'] is the whole row, ['daily', field] one value.
      if (key === undefined) return { date, table, key: date, type: 'added' };
      return {
        date,
        table,
        key: date,
        type: 'changed',
        field: key,
        old: d.type === 'CREATE' ? null : d.oldValue,
        new: d.type === 'REMOVE' ? null : d.value,
      };
    }
    // [table, key] is the whole row, [table, key, field] one value.
    if (field === undefined) {
      return {
        date,
        table,
        key,
        type: d.type === 'REMOVE' ? 'removed' : 'added',
      };
    }
    return {
      date,
      table,
      key,
      type: 'changed',
      field,
      old: d.type === 'CREATE' ? null : d.oldValue,
      new: d.type === 'REMOVE' ? null : d.value,
    };
  });
}
