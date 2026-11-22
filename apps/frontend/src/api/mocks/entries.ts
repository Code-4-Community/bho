import type { EntryListItem } from '@api/types';

const submitted = (date: string): EntryListItem => ({
  date,
  status: 'Submitted',
  lastUploadedBy: 'John Doe',
  lastModifiedAt: '2026-10-31T18:12:00Z',
  fileName: 'October 2026.csv',
  importId: 12,
});

export const mockEntries: EntryListItem[] = [
  submitted('2026-10-31'),
  submitted('2026-10-30'),
  { ...submitted('2026-10-29'), status: 'Corrected', correctedCount: 3 },
  { ...submitted('2026-10-28'), status: 'Flagged' },
  submitted('2026-10-27'),
  submitted('2026-10-26'),
  submitted('2026-10-25'),
  {
    date: '2026-10-24',
    status: 'Missing',
    lastUploadedBy: null,
    lastModifiedAt: null,
    fileName: null,
    importId: null,
  },
];
