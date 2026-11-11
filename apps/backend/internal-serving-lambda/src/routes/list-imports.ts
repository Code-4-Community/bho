import type { APIGatewayProxyEvent } from 'aws-lambda';
import type { RouteHandler } from '../routes';
import { response } from '../response';
import { getCurrentUser } from '../auth';
import { getDb } from '../db';
import {
  IMPORT_STATUSES,
  listImports,
  type ImportFilters,
  type Page,
} from '../imports';
import { UPLOAD_TYPES } from '../presigned-upload-url';

export const DEFAULT_LIMIT = 25;
export const MAX_LIMIT = 100;

// ISO 8601 in UTC, e.g. 2026-10-26T12:00:00Z or 2026-10-26T12:00:00.000Z
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

const parseInteger = (value: string | undefined, fallback: number) =>
  value === undefined ? fallback : /^\d+$/.test(value) ? Number(value) : NaN;

const parseTimestamp = (value: string | undefined) => {
  if (value === undefined) return undefined;
  const date = new Date(value);
  return ISO_UTC.test(value) && !isNaN(date.getTime()) ? date : null;
};

const oneOf = <T extends string>(values: readonly T[], value: unknown) =>
  values.includes(value as T);

// Returns the parsed query, or a message describing the first invalid param
const parseQuery = (
  event: APIGatewayProxyEvent,
): { filters: ImportFilters; page: Page } | string => {
  const query = event.queryStringParameters ?? {};

  const limit = parseInteger(query.limit, DEFAULT_LIMIT);
  if (!(limit >= 1 && limit <= MAX_LIMIT)) {
    return `limit must be an integer from 1 to ${MAX_LIMIT}`;
  }
  const offset = parseInteger(query.offset, 0);
  if (isNaN(offset)) return 'offset must be a non-negative integer';

  const { kind, status } = query;
  if (kind !== undefined && !oneOf(UPLOAD_TYPES, kind)) {
    return `kind must be one of: ${UPLOAD_TYPES.join(', ')}`;
  }
  if (status !== undefined && !oneOf(IMPORT_STATUSES, status)) {
    return `status must be one of: ${IMPORT_STATUSES.join(', ')}`;
  }

  const uploadedFrom = parseTimestamp(query.uploadedFrom);
  if (uploadedFrom === null) {
    return 'uploadedFrom must be an ISO 8601 UTC timestamp';
  }
  const uploadedTo = parseTimestamp(query.uploadedTo);
  if (uploadedTo === null) {
    return 'uploadedTo must be an ISO 8601 UTC timestamp';
  }
  if (uploadedFrom && uploadedTo && uploadedFrom > uploadedTo) {
    return 'uploadedFrom must not be after uploadedTo';
  }

  return {
    filters: {
      kind: kind as ImportFilters['kind'],
      status: status as ImportFilters['status'],
      uploadedFrom,
      uploadedTo,
    },
    page: { limit, offset },
  };
};

// GET /imports?kind&status&uploadedFrom&uploadedTo&limit&offset
export const listImportsHandler: RouteHandler = async (event) => {
  const user = await getCurrentUser(event);
  if (!user) return response(401, { message: 'Unauthorized' });

  const parsed = parseQuery(event);
  if (typeof parsed === 'string') return response(400, { message: parsed });

  const { imports, total } = await listImports(
    getDb(),
    parsed.filters,
    parsed.page,
  );

  return response(200, { imports, total, ...parsed.page });
};
