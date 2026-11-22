import type { ParsedDay, ParseResult, RowError } from '@bho/weather-parsing';
import { readCsv } from '../csv';
import { toIsoDate } from './cells';
import { parseHours } from './hourly';
import { DATE_LABEL } from './layout';
import { parseScheduled } from './scheduled';
import { Day } from './sheet';
import { parseSummary } from './summary';

function parseDay(day: Day): ParsedDay {
  const dateRow = day.row(day.start);
  const dateColumn = dateRow.cells.indexOf(DATE_LABEL) + 1;
  // Keep reading past a bad or missing date so the day's other errors show too.
  const expected = 'a date like "Wednesday, July 1, 2026"';
  const date = dateRow.read(dateColumn, DATE_LABEL, expected, toIsoDate) ?? '';
  if ((dateRow.cells[dateColumn] ?? '') === '') {
    day.fail(day.start, DATE_LABEL, `Expected ${expected}, got nothing`);
  }

  return {
    daily: parseSummary(day, date),
    hourly: parseHours(day, date),
    scheduled: parseScheduled(day, date),
  };
}

// Reports every problem, not just the first, so staff can fix the file in one
// upload. Cells are trimmed: the sheet pads labels ("DATE: ") and blanks.
export function parseDaily(csv: string): ParseResult<ParsedDay> {
  const table = readCsv(csv).map((cells) => cells.map((c) => c.trim()));
  const starts = table.flatMap((cells, i) =>
    cells.includes(DATE_LABEL) ? [i] : [],
  );
  if (starts.length === 0) {
    return { ok: false, errors: [{ reason: `No "${DATE_LABEL}" row` }] };
  }

  const errors: RowError[] = [];
  const rows = starts.map((start, n) =>
    parseDay(new Day(table, errors, start, starts[n + 1] ?? table.length)),
  );

  // A repeated date would collide on the (stationId, date) keys.
  const seen = new Map<string, number>();
  rows.forEach(({ daily: { date } }, n) => {
    if (date === '') return;
    const first = seen.get(date);
    if (first === undefined) seen.set(date, starts[n]);
    else {
      errors.push({
        row: starts[n] + 1,
        column: DATE_LABEL,
        reason: `${date} is also on row ${first + 1}`,
      });
    }
  });

  // Days are read section by section, so restore sheet order.
  errors.sort((a, b) => (a.row ?? 0) - (b.row ?? 0));
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, rows };
}
