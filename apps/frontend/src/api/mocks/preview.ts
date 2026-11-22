import type { ImportPreview } from '@api/types';

export const mockPreview: ImportPreview = {
  kind: 'daily',
  fileHash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
  summary: { added: 1, changed: 1, unchanged: 20 },
  changes: [
    { date: '2026-11-22', table: 'daily', key: '2026-11-22', type: 'added' },
    {
      date: '2026-11-21',
      table: 'daily',
      key: '2026-11-21',
      type: 'changed',
      field: 'maxTempF',
      old: 48,
      new: 49,
    },
    {
      date: '2026-11-21',
      table: 'hourly',
      key: '14',
      type: 'changed',
      field: 'windSpeedMph',
      old: 12,
      new: 21,
    },
  ],
  truncated: false,
};

export const mockInvalidPreview: ImportPreview = {
  kind: 'daily',
  fileHash: '60303ae22b998861bce3b28f33eec1be758a213c86c93c076dbe9f558c11c752',
  errors: [
    { row: 14, column: 'A', reason: '24HR Max is not a number' },
    { row: 47, column: 'D', reason: 'Average Temperature is missing' },
  ],
};
