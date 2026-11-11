import { readFileSync } from 'fs';
import { join } from 'path';
import type { DbDay } from '@bho/db-client';
import type { ParsedDay } from '@bho/weather-parsing';
import { parseDaily } from '../parsers/daily';
import { planDailyWrite } from './planDailyWrite';
import { toDbRows } from './toDbRows';

const parsed = parseDaily(
  readFileSync(join(__dirname, '../parsers/__fixtures__/daily.csv'), 'utf8'),
);
if (parsed.ok === false) throw new Error('fixture should parse');
const [july1, july2] = parsed.rows;

const OPTIONS = { stationId: 1, importId: 7 };
const clone = (day: ParsedDay): ParsedDay => JSON.parse(JSON.stringify(day));

// The days as the database would hold them, from an earlier upload (importId 1).
const stored = (...days: ParsedDay[]): DbDay[] =>
  days.map((day) => toDbRows(day, OPTIONS.stationId, 1));

describe('planDailyWrite', () => {
  it('inserts a day that is not stored, with stationId and importId', () => {
    const plan = planDailyWrite([july1], OPTIONS)([]);

    expect(plan.upserts.daily).toEqual([
      expect.objectContaining({ stationId: 1, importId: 7 }),
    ]);
    expect(plan.upserts.hourly).toHaveLength(july1.hourly.length);
    expect(plan.upserts.scheduled).toHaveLength(july1.scheduled.length);
    expect(plan.deletes).toEqual([
      { date: july1.daily.date, hours: [], obsTimes: [] },
    ]);
    expect(plan.result.counts).toEqual({
      inserted: 1 + july1.hourly.length + july1.scheduled.length,
      updated: 0,
      unchanged: 0,
      deleted: 0,
    });
    expect(plan.result.changes.every((c) => c.type === 'added')).toBe(true);
  });

  it('writes nothing when the upload matches what is stored', () => {
    const plan = planDailyWrite(
      [clone(july1), clone(july2)],
      OPTIONS,
    )(stored(july1, july2));

    expect(plan.upserts).toEqual({ daily: [], hourly: [], scheduled: [] });
    expect(plan.result.changes).toEqual([]);
    expect(plan.result.counts).toMatchObject({
      inserted: 0,
      updated: 0,
      deleted: 0,
    });
    expect(plan.result.counts.unchanged).toBeGreaterThan(0);
  });

  it('rewrites only the rows whose values changed, and says what changed', () => {
    const next = clone(july1);
    const hour = next.hourly[3];
    const oldMax = next.daily.maxTempF;
    const oldTemp = hour.tempF;
    next.daily.maxTempF = (oldMax ?? 0) + 1;
    hour.tempF = (oldTemp ?? 0) + 1;

    const plan = planDailyWrite([next], OPTIONS)(stored(july1));

    expect(plan.upserts.daily).toHaveLength(1);
    expect(plan.upserts.hourly).toEqual([
      expect.objectContaining({ hour: hour.hour }),
    ]);
    expect(plan.upserts.scheduled).toEqual([]);
    expect(plan.result.counts).toMatchObject({
      inserted: 0,
      updated: 2,
      deleted: 0,
    });
    expect(plan.result.changes).toEqual([
      {
        date: next.daily.date,
        table: 'daily',
        key: next.daily.date,
        type: 'changed',
        field: 'maxTempF',
        old: oldMax,
        new: next.daily.maxTempF,
      },
      {
        date: next.daily.date,
        table: 'hourly',
        key: String(hour.hour),
        type: 'changed',
        field: 'tempF',
        old: oldTemp,
        new: hour.tempF,
      },
    ]);
  });

  it('deletes hours and readings that are no longer in the sheet', () => {
    const next = clone(july1);
    const hours = next.hourly.splice(0, 2).map((h) => h.hour);
    const [gone] = next.scheduled.splice(0, 1);

    const plan = planDailyWrite([next], OPTIONS)(stored(july1));

    expect(plan.deletes).toEqual([
      { date: next.daily.date, hours, obsTimes: [gone.obsTime] },
    ]);
    expect(plan.upserts).toEqual({ daily: [], hourly: [], scheduled: [] });
    expect(plan.result.counts.deleted).toBe(3);
    // The rows after the dropped hours did not shift into "changed".
    expect(plan.result.counts.updated).toBe(0);
  });

  it('leaves stored days that are not in the upload alone', () => {
    const plan = planDailyWrite([clone(july1)], OPTIONS)(stored(july1, july2));

    expect(plan.deletes.map((d) => d.date)).toEqual([july1.daily.date]);
    expect(plan.result.counts.deleted).toBe(0);
  });
});
