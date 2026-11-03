import type { Kysely } from 'kysely';
import type { Database } from '@bho/db-client';
import type { UploadType } from './presigned-upload-url';

export const IMPORT_STATUSES = ['succeeded', 'failed'] as const;
export type ImportStatus = (typeof IMPORT_STATUSES)[number];

export interface ImportFilters {
  kind?: UploadType;
  status?: ImportStatus;
  uploadedFrom?: Date;
  uploadedTo?: Date;
}

export interface Page {
  limit: number;
  offset: number;
}

// Every column except errors, which can be large and is only returned by
// GET /imports/{id}
const SUMMARY_COLUMNS = [
  'id',
  'kind',
  'fileName',
  's3Key',
  'fileHash',
  'uploadedBy',
  'uploadedAt',
  'status',
] as const;

// Newest uploadedAt first; id breaks ties so pages don't overlap
export const listImports = async (
  db: Kysely<Database>,
  { kind, status, uploadedFrom, uploadedTo }: ImportFilters,
  { limit, offset }: Page,
) => {
  let query = db.selectFrom('imports');
  if (kind) query = query.where('kind', '=', kind);
  if (status) query = query.where('status', '=', status);
  if (uploadedFrom) query = query.where('uploadedAt', '>=', uploadedFrom);
  if (uploadedTo) query = query.where('uploadedAt', '<=', uploadedTo);

  const [imports, { total }] = await Promise.all([
    query
      .select(SUMMARY_COLUMNS)
      .orderBy('uploadedAt', 'desc')
      .orderBy('id', 'desc')
      .limit(limit)
      .offset(offset)
      .execute(),
    query
      .select((eb) => eb.fn.countAll<string>().as('total'))
      .executeTakeFirstOrThrow(),
  ]);

  return { imports, total: Number(total) };
};
