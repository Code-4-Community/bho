// Response types for the functions in src/api/ live here, so that hooks,
// components and mock data all share one definition.

export interface EntryListItem {
  date: string;
  status: 'Missing' | 'Submitted' | 'Flagged' | 'Corrected';
  lastUploadedBy: string | null;
  lastModifiedAt: string | null;
  fileName: string | null;
  importId: number | null;
  correctedCount?: number;
}

export type PipelineSource =
  | 'WeatherLink'
  | 'APRSWxNet'
  | 'Weather Underground';

export interface ErrorLogEntry {
  id: number;
  occurredAt: string;
  source: PipelineSource;
  description: string;
  retryCount: number;
  outcome: 'succeeded' | 'retrying' | 'failed';
}
