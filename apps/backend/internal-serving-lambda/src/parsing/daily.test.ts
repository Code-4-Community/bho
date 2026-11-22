import { readFileSync } from 'fs';
import { join } from 'path';
import { readCsv } from './csv';
import { parseDaily } from './daily';

const FIXTURE = readFileSync(join(__dirname, '__fixtures__/daily.csv'), 'utf8');

// Each day in the fixture is 60 rows; July 1 is rows 1-60.
const DAY_ROWS = 60;

function july1(): string[][] {
  return readCsv(FIXTURE).slice(0, DAY_ROWS);
}

// Sets the cell at a 1-based sheet row and 0-based column.
function edit(table: string[][], row: number, col: number, value: string) {
  const copy = table.map((cells) => [...cells]);
  copy[row - 1][col] = value;
  return copy;
}

function toCsv(table: string[][]): string {
  const quote = (v: string) =>
    /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  return table.map((cells) => cells.map(quote).join(',')).join('\n');
}

function parse(table: string[][]) {
  const result = parseDaily(toCsv(table));
  if (result.ok === false) {
    throw new Error(
      `expected parsing to pass: ${JSON.stringify(result.errors)}`,
    );
  }
  return result.rows[0];
}

function errorsOf(table: string[][]) {
  const result = parseDaily(toCsv(table));
  if (result.ok === true) throw new Error('expected parsing to fail');
  return result.errors;
}

describe('parseDaily', () => {
  describe('the July 2026 fixture', () => {
    const result = parseDaily(FIXTURE);
    const days = result.ok ? result.rows : [];
    const day = (n: number) => days[n - 1];

    it('returns every day of the month, each with 24 hours', () => {
      expect(result).toMatchObject({ ok: true });
      expect(days.map((d) => d.daily.date)).toEqual(
        Array.from(
          { length: 31 },
          (_, i) => `2026-07-${String(i + 1).padStart(2, '0')}`,
        ),
      );
      for (const d of days) {
        expect(d.hourly.map((h) => h.hour)).toEqual(
          Array.from({ length: 24 }, (_, i) => i),
        );
      }
    });

    it('reads the summary of a day', () => {
      expect(day(1).daily).toEqual({
        date: '2026-07-01',
        maxTempF: 95,
        minTempF: 68,
        avgTempF: '82',
        normalTempF: 71,
        precipIn: '0.00',
        precipTrace: false,
        snowfallIn: '0.0',
        snowDepthIn: '0',
        sunshineMin: 704,
        sunshinePossibleMin: 914,
        sunshinePct: 77,
        fastestMileMph: 17,
        fastestMileDir: 'SW',
        fastestMileTime: '02:45',
        peakGustKts: 20,
        peakGustDir: 'WSW',
        peakGustTime: '08:54',
        avgStationPressureMb: '991',
        sunrise: '04:11',
        sunset: '19:25',
        observerInitials: 'MFD/AKJ',
        remarks: '[1] K LYR ALF ALQDS HAZY',
      });
    });

    it('reads every column of an hourly row', () => {
      expect(day(1).hourly[6]).toEqual({
        date: '2026-07-01',
        hour: 6,
        tempF: 72,
        precipIn: null,
        precipTrace: false,
        windDir: 'WSW',
        windSpeedMph: 11,
        sunshineMin: 6,
        skyCover: 6,
        visibilityMi: '35',
        presentWeather: '0',
        humidityPct: 80,
        mountainVis: null,
        remarks: 'BKN AC/ACC BKN CI HAZY',
      });
    });

    it('reads blank and whitespace-only cells as null', () => {
      // 07-08 has a single space under Sunshine.
      expect(day(1).hourly[7]).toMatchObject({
        sunshineMin: null,
        skyCover: null,
        mountainVis: '1@1.5',
      });
    });

    it('joins the 0700 scheduled row with its pressure block column', () => {
      expect(day(1).scheduled[0]).toEqual({
        date: '2026-07-01',
        obsTime: '07:00',
        stationPressureIn: '29.285',
        attachedThermC: '21.3',
        observedBarometerMb: '995.5',
        pressureCorrectionMb: '-3.8',
        dryBulbF: '72.2',
        wetBulbF: '67.9',
        dewpointF: 66,
        humidityPct: 80,
        maxTempF: 88,
        minTempF: 68,
        precipIn: null,
        precipTrace: false,
        snowfallIn: '0.0',
        snowDepthIn: '0',
        vaporPressureMb: '21.8',
      });
    });

    it('drops the "Average ->" label and average from the 0800 row', () => {
      expect(day(1).scheduled[1]).toMatchObject({
        obsTime: '08:00',
        dryBulbF: '74.1',
        snowfallIn: null,
        vaporPressureMb: null,
      });
    });

    it('sorts scheduled observations by time', () => {
      expect(day(1).scheduled.map((s) => s.obsTime)).toEqual([
        '07:00',
        '08:00',
        '10:00',
        '13:00',
        '19:00',
      ]);
    });

    it('adds a reading found only in the pressure block', () => {
      // July 3 has a "1200E" column after AVG.
      expect(day(3).scheduled.find((s) => s.obsTime === '12:00')).toEqual({
        date: '2026-07-03',
        obsTime: '12:00',
        stationPressureIn: null,
        attachedThermC: '22.6',
        observedBarometerMb: '993.6',
        pressureCorrectionMb: '-3.9',
        dryBulbF: null,
        wetBulbF: null,
        dewpointF: null,
        humidityPct: null,
        maxTempF: null,
        minTempF: null,
        precipIn: null,
        precipTrace: false,
        snowfallIn: null,
        snowDepthIn: null,
        vaporPressureMb: null,
      });
      // July 7's is "1205", without the E.
      expect(day(7).scheduled.map((s) => s.obsTime)).toContain('12:05');
    });

    it('reads AVG station pressure, not the extra reading after it', () => {
      expect(day(3).daily.avgStationPressureMb).toBe('989');
      expect(day(7).daily.avgStationPressureMb).toBe('995');
    });

    it('reads "T" precipitation as a trace', () => {
      expect(day(5).daily).toMatchObject({ precipIn: null, precipTrace: true });
      expect(day(5).hourly[23]).toMatchObject({
        precipIn: null,
        precipTrace: true,
      });
      expect(day(6).scheduled[0]).toMatchObject({
        obsTime: '07:00',
        precipIn: null,
        precipTrace: true,
      });
    });

    it('keeps the first time of a gust with several', () => {
      // "28 WNW @ 1631E, 1651E"
      expect(day(3).daily).toMatchObject({
        peakGustKts: 28,
        peakGustDir: 'WNW',
        peakGustTime: '16:31',
      });
    });

    it('joins several notes with newlines, and reads no notes as null', () => {
      expect(day(2).daily.remarks).toBe(
        [
          '[1] PK WND 2635/17/',
          '[2] FEW AC DSNT WNW-NW HAZY',
          '[3] FEW CI DSNT ESE-SSW HAZY HX 98',
          '[4] OCNL LTGICCG  WSW-S',
        ].join('\n'),
      );
      expect(day(6).daily.remarks).toBeNull();
    });
  });

  describe('value formats', () => {
    it('reads a percentage written as a fraction', () => {
      expect(parse(edit(july1(), 44, 7, '0.77')).daily.sunshinePct).toBe(77);
    });

    it('reads fractional visibility', () => {
      expect(parse(edit(july1(), 10, 7, '1/8')).hourly[6].visibilityMi).toBe(
        '0.125',
      );
      expect(parse(edit(july1(), 10, 7, '1 1/2')).hourly[6].visibilityMi).toBe(
        '1.5',
      );
    });

    it('ignores a footnote "*" after a number', () => {
      const day = parse(edit(edit(july1(), 44, 8, '17*'), 44, 0, '95*'));
      expect(day.daily).toMatchObject({ fastestMileMph: 17, maxTempF: 95 });
    });

    it('reads a gust without a direction', () => {
      expect(parse(edit(july1(), 44, 11, '20 @ 0854E')).daily).toMatchObject({
        peakGustKts: 20,
        peakGustDir: null,
        peakGustTime: '08:54',
      });
    });

    it('upper-cases a lower-case wind direction', () => {
      expect(parse(edit(july1(), 10, 3, 'wsw')).hourly[6].windDir).toBe('WSW');
    });
  });

  describe('errors', () => {
    it('rejects unreadable hourly values', () => {
      let table = july1();
      table = edit(table, 10, 1, 'hot');
      table = edit(table, 10, 3, 'XYZ');
      table = edit(table, 10, 5, '61');
      table = edit(table, 10, 6, '9');
      table = edit(table, 10, 7, 'far');
      expect(errorsOf(table)).toEqual([
        {
          row: 10,
          column: 'Temp (°F)',
          reason: 'Expected a whole number, got "hot"',
        },
        {
          row: 10,
          column: 'Wind Dir.',
          reason: 'Expected a compass direction, got "XYZ"',
        },
        {
          row: 10,
          column: 'Sunshine (min)',
          reason: 'Expected 0 to 60, got 61',
        },
        {
          row: 10,
          column: 'Sky Cover (0-8)',
          reason: 'Expected 0 to 8, got 9',
        },
        {
          row: 10,
          column: 'Lwst VSBL (mls)',
          reason: 'Expected a distance like "35" or "1/8", got "far"',
        },
      ]);
    });

    it('rejects unreadable summary values', () => {
      let table = july1();
      table = edit(table, 44, 2, '0.0.0');
      table = edit(table, 44, 7, '120%');
      table = edit(table, 44, 10, '2460E');
      expect(errorsOf(table)).toEqual([
        {
          row: 44,
          column: 'Water Equiv.',
          reason: 'Expected a number, got "0.0.0"',
        },
        { row: 44, column: '% poss.', reason: 'Expected 0% to 100%, got 120%' },
        {
          row: 44,
          column: 'Time',
          reason: 'Expected a time like "0245E", got "2460E"',
        },
      ]);
    });

    it('rejects a malformed peak gust or gust direction', () => {
      expect(errorsOf(edit(july1(), 44, 11, '20 WSW'))).toEqual([
        {
          row: 44,
          column: 'Peak Gust (KTS)',
          reason: 'Expected a gust like "20 WSW @ 0854E", got "20 WSW"',
        },
      ]);
      expect(errorsOf(edit(july1(), 44, 11, '20 WXW @ 0854E'))).toEqual([
        {
          row: 44,
          column: 'Peak Gust (KTS)',
          reason: 'Not a compass direction: "WXW"',
        },
      ]);
    });

    it('rejects a bad scheduled or pressure block value', () => {
      let table = july1();
      table = edit(table, 34, 2, 'warm');
      table = edit(table, 53, 2, '?');
      expect(errorsOf(table)).toEqual([
        {
          row: 34,
          column: 'Dry Bulb',
          reason: 'Expected a number, got "warm"',
        },
        {
          row: 53,
          column: 'Attached Therm.',
          reason: 'Expected a number, got "?"',
        },
      ]);
    });

    it('rejects a date that is missing or not on the calendar', () => {
      expect(errorsOf(edit(july1(), 1, 9, 'Friday, June 31, 2026'))).toEqual([
        {
          row: 1,
          column: 'DATE:',
          reason:
            'Expected a date like "Wednesday, July 1, 2026", got "Friday, June 31, 2026"',
        },
      ]);
      expect(errorsOf(edit(july1(), 1, 9, ''))).toEqual([
        {
          row: 1,
          column: 'DATE:',
          reason: 'Expected a date like "Wednesday, July 1, 2026", got nothing',
        },
      ]);
    });

    it('rejects a day missing a section, on its DATE: row', () => {
      const table = edit(july1(), 43, 0, '24 HR Max');
      expect(errorsOf(table)).toEqual([
        { row: 1, reason: 'No "24HR Max" row' },
      ]);
    });

    it('rejects a bad or repeated hour', () => {
      let table = july1();
      table = edit(table, 9, 0, '05-07');
      table = edit(table, 11, 0, '06-07');
      expect(errorsOf(table)).toEqual([
        {
          row: 9,
          column: 'Time (EST)',
          reason: 'Expected an hour like "05-06", got "05-07"',
        },
        { row: 11, column: 'Time (EST)', reason: '06-07 is also on row 10' },
      ]);
    });

    it('rejects a bad or repeated scheduled time', () => {
      let table = july1();
      table = edit(table, 37, 0, '0800');
      table = edit(table, 38, 0, '1360');
      expect(errorsOf(table)).toEqual([
        { row: 37, column: 'Time (EST)', reason: '0800 is also on row 36' },
        { row: 38, column: 'Time (EST)', reason: 'Not a time of day: "1360"' },
      ]);
    });

    it('rejects the same date twice', () => {
      const table = readCsv(FIXTURE).slice(0, DAY_ROWS * 2);
      table[DAY_ROWS][9] = 'Wednesday, July 1, 2026';
      expect(errorsOf(table)).toEqual([
        { row: 61, column: 'DATE:', reason: '2026-07-01 is also on row 1' },
      ]);
    });

    it('lists errors from several days in sheet order', () => {
      let table = readCsv(FIXTURE).slice(0, DAY_ROWS * 2);
      table = edit(table, 104, 0, 'x');
      table = edit(table, 10, 1, 'x');
      expect(errorsOf(table).map((e) => e.row)).toEqual([10, 104]);
    });

    it('rejects a file with no DATE: row', () => {
      expect(
        errorsOf([
          ['a', 'b'],
          ['1', '2'],
        ]),
      ).toEqual([{ reason: 'No "DATE:" row' }]);
    });
  });
});
