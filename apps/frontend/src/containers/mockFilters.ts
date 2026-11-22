import type { FilterOption } from '@components/Filter';

// Mock data for the /dev/buttons preview. Dates are fixed so the page is the
// same every day.

export interface MockEntry {
  id: number;
  date: string; // ISO yyyy-mm-dd
  uploader: 'intern' | 'admin';
}

export const MOCK_ENTRIES: MockEntry[] = [
  { id: 1, date: '2026-10-02', uploader: 'intern' },
  { id: 2, date: '2026-10-05', uploader: 'admin' },
  { id: 3, date: '2026-10-12', uploader: 'intern' },
  { id: 4, date: '2026-10-19', uploader: 'intern' },
  { id: 5, date: '2026-10-23', uploader: 'admin' },
  { id: 6, date: '2026-10-27', uploader: 'intern' },
  { id: 7, date: '2026-10-30', uploader: 'admin' },
  { id: 8, date: '2026-11-01', uploader: 'intern' },
];

/** Preset date ranges. A real range picker can replace this later: keep the
 * `{ value, label }` shape so `Filter` doesn't change. [from, to], inclusive. */
export const DATE_PRESETS: (FilterOption & { range: [string, string] })[] = [
  {
    value: 'oct-nov',
    label: 'Oct 1 - Nov 1, 2026',
    range: ['2026-10-01', '2026-11-01'],
  },
  {
    value: 'last-7',
    label: 'Last 7 days',
    range: ['2026-10-26', '2026-11-01'],
  },
  {
    value: 'last-30',
    label: 'Last 30 days',
    range: ['2026-10-03', '2026-11-01'],
  },
  {
    value: 'sep',
    label: 'Sep 1 - Sep 30, 2026',
    range: ['2026-09-01', '2026-09-30'],
  },
];

export const UPLOADER_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'All uploaders' },
  { value: 'intern', label: 'Intern' },
  { value: 'admin', label: 'Admin' },
];

export const DEFAULT_DATE = 'oct-nov';
export const DEFAULT_UPLOADER = 'all';

export function filterEntries(
  entries: MockEntry[],
  dateValue: string,
  uploader: string,
): MockEntry[] {
  const preset = DATE_PRESETS.find((p) => p.value === dateValue);
  return entries.filter((e) => {
    const inRange = preset
      ? e.date >= preset.range[0] && e.date <= preset.range[1]
      : true;
    return inRange && (uploader === 'all' || e.uploader === uploader);
  });
}
