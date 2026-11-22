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

export type UploadKind = 'daily' | 'historical';

export interface UploadUrl {
  uploadUrl: string;
  s3Key: string;
  expiresAt: string;
}

export interface RowError {
  row?: number;
  column?: string;
  reason: string;
}

export interface ImportChange {
  date: string;
  table: 'daily' | 'hourly' | 'scheduled';
  key: string;
  type: 'added' | 'removed' | 'changed';
  field?: string;
  old?: unknown;
  new?: unknown;
}

export type ImportPreview =
  | { kind: UploadKind; fileHash: string; errors: RowError[] }
  | {
      kind: UploadKind;
      fileHash: string;
      summary: { added: number; changed: number; unchanged: number };
      changes: ImportChange[];
      truncated: boolean;
    };
