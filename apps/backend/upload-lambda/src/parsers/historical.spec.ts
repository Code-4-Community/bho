import { readFileSync } from 'fs';
import { join } from 'path';
import { parseHistorical } from './historical';

// January 1 from the fixture, keyed by sheet header.
const BASE: Record<string, string> = {
  Month: 'January',
  'Month #': '1',
  Day: '1',
  'High °F': '50',
  'High Year(s)': '1930',
  'Low °F': '-18',
  'Low Year(s)': '2014, 1977',
  'Precip in': '6.14',
  'Precip Year(s)': '1907',
  'Snow in': '18.5',
  'Snow Year(s)': '2019',
  'Peak Gust mph': '111',
  'Wind Dir': 'NW',
  'Estimated?': 'TRUE',
  'Gust Year(s)': '2013',
  Notes: 'SYNTHETIC',
  'Source text': 'HIGH 50 1900 | LOW -18 1963',
};

// Header on row 1, so the first data row is row 2.
function sheet(...rows: Record<string, string>[]): string {
  const header = Object.keys(BASE);
  const quote = (v: string) =>
    /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  return [header, ...rows.map((r) => header.map((h) => ({ ...BASE, ...r }[h])))]
    .map((cells) => cells.map(quote).join(','))
    .join('\n');
}

function errorsOf(csv: string) {
  const result = parseHistorical(csv);
  if (result.ok === true) throw new Error('expected parsing to fail');
  return result.errors;
}

describe('parseHistorical', () => {
  describe('the All Daily Records fixture', () => {
    const result = parseHistorical(
      readFileSync(join(__dirname, '__fixtures__/historical.csv'), 'utf8'),
    );
    const rows = result.ok ? result.rows : [];

    it('returns one record per calendar day, Feb 29 included', () => {
      expect(result).toMatchObject({ ok: true });
      expect(rows).toHaveLength(366);
      expect(rows.some((r) => r.month === 2 && r.day === 29)).toBe(true);
    });

    it('reads every column of a row', () => {
      expect(rows[0]).toEqual({
        month: 1,
        day: 1,
        highF: 50,
        highYears: [1930],
        lowF: -18,
        lowYears: [2014, 1977],
        precipIn: '6.14',
        precipYears: [1907],
        snowIn: '18.5',
        snowYears: [2019],
        peakGustMph: 111,
        peakGustDir: 'NW',
        peakGustIsEstimated: true,
        peakGustYears: [2013],
        notes: 'SYNTHETIC',
      });
    });

    it('stores snow "None" as null value and years', () => {
      const july4 = rows.find((r) => r.month === 7 && r.day === 4);
      expect(july4).toMatchObject({ snowIn: null, snowYears: null });
      expect(rows.filter((r) => r.snowIn === null)).toHaveLength(176);
    });

    it('keeps decimals as written', () => {
      const dec28 = rows.find((r) => r.month === 12 && r.day === 28);
      expect(dec28?.precipIn).toBe('5.30');
    });

    it('reads blank notes as null', () => {
      expect(rows[1].notes).toBeNull();
    });
  });

  it('parses a header that is not on the first row', () => {
    const result = parseHistorical(`https://example.com,,\n,,\n${sheet(BASE)}`);
    expect(result.ok && result.rows).toHaveLength(1);
  });

  it('skips blank rows', () => {
    const result = parseHistorical(`${sheet(BASE)}\n,,,,\n\n`);
    expect(result.ok && result.rows).toHaveLength(1);
  });

  it('treats blank or "None" values with blank years as no record', () => {
    const result = parseHistorical(
      sheet({
        'High °F': '',
        'High Year(s)': '',
        'Peak Gust mph': 'none',
        'Gust Year(s)': '',
        'Wind Dir': '',
        'Estimated?': '',
      }),
    );
    expect(result.ok && result.rows[0]).toMatchObject({
      highF: null,
      highYears: null,
      peakGustMph: null,
      peakGustYears: null,
      peakGustDir: null,
      peakGustIsEstimated: false,
    });
  });

  it('rejects years without a value, and a value without years', () => {
    expect(errorsOf(sheet({ 'Snow in': 'None', 'Low Year(s)': '' }))).toEqual([
      { row: 2, column: 'Low Year(s)', reason: 'Missing years for Low °F -18' },
      { row: 2, column: 'Snow Year(s)', reason: 'Years given but no Snow in' },
    ]);
  });

  it('rejects values that are not numbers or years', () => {
    expect(
      errorsOf(
        sheet({
          'High °F': '50.5',
          'Precip in': 'T',
          'Gust Year(s)': '2013, 13',
        }),
      ),
    ).toEqual([
      {
        row: 2,
        column: 'High °F',
        reason: 'Expected a whole number, got "50.5"',
      },
      { row: 2, column: 'Precip in', reason: 'Expected a number, got "T"' },
      { row: 2, column: 'Gust Year(s)', reason: 'Not a year: "13"' },
    ]);
  });

  it('rejects an unknown wind direction or estimated flag', () => {
    expect(
      errorsOf(sheet({ 'Wind Dir': 'NNNW', 'Estimated?': 'yes' })),
    ).toEqual([
      {
        row: 2,
        column: 'Wind Dir',
        reason: 'Not a compass direction: "NNNW"',
      },
      {
        row: 2,
        column: 'Estimated?',
        reason: 'Expected TRUE or FALSE, got "YES"',
      },
    ]);
  });

  it('rejects days that are not on the calendar', () => {
    expect(
      errorsOf(
        sheet(
          { Month: 'February', 'Month #': '2', Day: '30' },
          { Month: '', 'Month #': '13', Day: '1' },
        ),
      ),
    ).toEqual([
      { row: 2, column: 'Day', reason: 'February has no day 30' },
      { row: 3, column: 'Month #', reason: 'No month 13' },
    ]);
  });

  it('rejects a month name that disagrees with Month #', () => {
    expect(errorsOf(sheet({ Month: 'March' }))).toEqual([
      {
        row: 2,
        column: 'Month',
        reason: '"March" does not match Month # 1',
      },
    ]);
  });

  it('rejects the same day twice', () => {
    expect(errorsOf(sheet(BASE, { Day: '2' }, BASE))).toEqual([
      { row: 4, column: 'Day', reason: 'January 1 is also on row 2' },
    ]);
  });

  it('rejects a sheet missing a column', () => {
    const csv = sheet(BASE).replace('Gust Year(s)', 'Gust Years');
    expect(errorsOf(csv)).toEqual([
      { row: 1, column: 'Gust Year(s)', reason: 'Missing column' },
    ]);
  });

  it('rejects a file with no header row or no data', () => {
    expect(errorsOf('a,b\n1,2')).toEqual([
      { reason: 'No header row with "Month #" and "Day"' },
    ]);
    expect(errorsOf(sheet())).toEqual([{ reason: 'No data rows' }]);
  });
});
