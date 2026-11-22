import { formatDate, parseDate, todayET } from './date';

describe('parseDate', () => {
  it('parses as UTC midnight', () => {
    expect(parseDate('2026-11-21').toISOString()).toBe(
      '2026-11-21T00:00:00.000Z',
    );
  });
});

describe('formatDate', () => {
  it('formats without shifting the day', () => {
    expect(formatDate('2026-11-21')).toBe('Nov 21, 2026');
  });

  it('handles the first and last day of a year', () => {
    expect(formatDate('2026-01-01')).toBe('Jan 1, 2026');
    expect(formatDate('2026-12-31')).toBe('Dec 31, 2026');
  });
});

describe('todayET', () => {
  it('stays on the same day late in the evening (standard time)', () => {
    // 23:30 EST on Nov 21 is 04:30 UTC on Nov 22
    expect(todayET(new Date('2026-11-22T04:30:00Z'))).toBe('2026-11-21');
  });

  it('stays on the same day late in the evening (daylight time)', () => {
    // 23:30 EDT on Jul 3 is 03:30 UTC on Jul 4
    expect(todayET(new Date('2026-07-04T03:30:00Z'))).toBe('2026-07-03');
  });

  it('moves to the next day after midnight Eastern', () => {
    // 00:30 EST on Nov 22 is 05:30 UTC
    expect(todayET(new Date('2026-11-22T05:30:00Z'))).toBe('2026-11-22');
  });

  it('defaults to the current time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-22T04:30:00Z'));
    expect(todayET()).toBe('2026-11-21');
    vi.useRealTimers();
  });
});
