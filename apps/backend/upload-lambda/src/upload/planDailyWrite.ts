import type { DbDay, WritePlan } from '@bho/db-client';
import type { ParsedDay } from '@bho/weather-parsing';
import { Change, diffDays } from './diffDays';
import { toDbRows } from './toDbRows';

export interface Counts {
  inserted: number;
  updated: number;
  unchanged: number;
  deleted: number;
}

export interface DailyWriteResult {
  counts: Counts;
  changes: Change[];
}

const rowId = (c: Pick<Change, 'date' | 'table' | 'key'>) =>
  `${c.table} ${c.date} ${c.key}`;

// Turns the parsed days of an upload into the `plan` that writeDailyObservations
// calls with the stored days.
export function planDailyWrite(
  days: ParsedDay[],
  { stationId, importId }: { stationId: number; importId: number },
): (stored: DbDay[]) => WritePlan<DailyWriteResult> {
  const incoming = days.map((day) => toDbRows(day, stationId, importId));

  return (stored) => {
    const storedByDate = new Map(stored.map((day) => [day.daily.date, day]));
    const changes = incoming.flatMap((day) =>
      diffDays(storedByDate.get(day.daily.date), day),
    );

    const ids = (type: Change['type']) =>
      new Set(changes.filter((c) => c.type === type).map(rowId));
    const added = ids('added');
    const changed = ids('changed');
    const removed = changes.filter((c) => c.type === 'removed');
    const write = (id: string) => added.has(id) || changed.has(id);

    const total = incoming.reduce(
      (sum, day) => sum + 1 + day.hourly.length + day.scheduled.length,
      0,
    );
    return {
      upserts: {
        daily: incoming
          .map((day) => day.daily)
          .filter((row) =>
            write(rowId({ table: 'daily', date: row.date, key: row.date })),
          ),
        hourly: incoming.flatMap((day) =>
          day.hourly.filter((row) =>
            write(
              rowId({ table: 'hourly', date: row.date, key: String(row.hour) }),
            ),
          ),
        ),
        scheduled: incoming.flatMap((day) =>
          day.scheduled.filter((row) =>
            write(
              rowId({ table: 'scheduled', date: row.date, key: row.obsTime }),
            ),
          ),
        ),
      },
      deletes: incoming.map(({ daily: { date } }) => ({
        date,
        hours: removed
          .filter((c) => c.date === date && c.table === 'hourly')
          .map((c) => Number(c.key)),
        obsTimes: removed
          .filter((c) => c.date === date && c.table === 'scheduled')
          .map((c) => c.key),
      })),
      result: {
        counts: {
          inserted: added.size,
          updated: changed.size,
          unchanged: total - added.size - changed.size,
          deleted: removed.length,
        },
        changes,
      },
    };
  };
}
