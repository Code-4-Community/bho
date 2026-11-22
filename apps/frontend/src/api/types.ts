// Response types for the functions in src/api/ live here, so that hooks,
// components and mock data all share one definition.

// One day from GET /entries (#64). Missing days have no data, so every field
// after `status` is null.
export interface EntryListItem {
  date: string;
  status: 'Missing' | 'Submitted' | 'Flagged' | 'Corrected';
  lastUploadedBy: string | null;
  lastModifiedAt: string | null;
  fileName: string | null;
  importId: number | null;
  // Flags a later upload resolved, shown as "Corrected (3)". #64 asks for it
  // but the route doesn't serve it yet.
  correctedCount?: number;
}

// Names match the providers from GET /pipeline-status (#65).
export type PipelineSource =
  | 'WeatherLink'
  | 'APRSWxNet'
  | 'Weather Underground';

// No route serves the error log yet, so this follows the Figma columns.
export interface ErrorLogEntry {
  id: number;
  occurredAt: string;
  source: PipelineSource;
  description: string;
  retryCount: number;
  outcome: 'succeeded' | 'retrying' | 'failed';
}
