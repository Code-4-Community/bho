import type { APIGatewayProxyEvent } from 'aws-lambda';
import type { RouteHandler } from '../routes';
import { response } from '../response';
import { getCurrentUser } from '../auth';
import { getDb } from '../db';
import {
  AUDITED_TABLES,
  listAuditLog,
  type AuditLogFilters,
} from '../audit-log';
import type { Page } from '../imports';
import { MAX_ID } from './get-import';
import {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  oneOf,
  parseInteger,
  parseTimestamp,
} from './list-imports';

// rowKey is always a JSON object of the changed row's primary key, e.g.
// {"stationId":1,"date":"2026-10-26"}
const parseRowKey = (value: string | undefined) => {
  let rowKey: unknown;
  if (value === undefined) return undefined;
  try {
    rowKey = JSON.parse(value);
  } catch {
    return null;
  }
  const isObject =
    typeof rowKey === 'object' && rowKey !== null && !Array.isArray(rowKey);
  return isObject ? (rowKey as Record<string, unknown>) : null;
};

// Returns the parsed query, or a message describing the first invalid param
const parseQuery = (
  event: APIGatewayProxyEvent,
): { filters: AuditLogFilters; page: Page } | string => {
  const query = event.queryStringParameters ?? {};

  const limit = parseInteger(query.limit, DEFAULT_LIMIT);
  if (!(limit >= 1 && limit <= MAX_LIMIT)) {
    return `limit must be an integer from 1 to ${MAX_LIMIT}`;
  }
  const offset = parseInteger(query.offset, 0);
  if (isNaN(offset)) return 'offset must be a non-negative integer';

  const changedFrom = parseTimestamp(query.changedFrom);
  if (changedFrom === null) {
    return 'changedFrom must be an ISO 8601 UTC timestamp';
  }
  const changedTo = parseTimestamp(query.changedTo);
  if (changedTo === null) {
    return 'changedTo must be an ISO 8601 UTC timestamp';
  }
  if (changedFrom && changedTo && changedFrom > changedTo) {
    return 'changedFrom must not be after changedTo';
  }

  const { tableName } = query;
  if (tableName !== undefined && !oneOf(AUDITED_TABLES, tableName)) {
    return `tableName must be one of: ${AUDITED_TABLES.join(', ')}`;
  }

  const importId =
    query.importId === undefined ? undefined : parseInteger(query.importId, 0);
  if (importId !== undefined && !(importId >= 1 && importId <= MAX_ID)) {
    return 'importId must be a positive integer';
  }

  const rowKey = parseRowKey(query.rowKey);
  if (rowKey === null) return 'rowKey must be a JSON object';

  return {
    filters: {
      changedFrom,
      changedTo,
      tableName: tableName as AuditLogFilters['tableName'],
      importId,
      rowKey,
    },
    page: { limit, offset },
  };
};

// GET /audit-log?changedFrom&changedTo&tableName&importId&rowKey&limit&offset
export const listAuditLogHandler: RouteHandler = async (event) => {
  const user = await getCurrentUser(event);
  if (!user) return response(401, { message: 'Unauthorized' });

  const parsed = parseQuery(event);
  if (typeof parsed === 'string') return response(400, { message: parsed });

  const { items, total } = await listAuditLog(
    getDb(),
    parsed.filters,
    parsed.page,
  );

  return response(200, { items, total, ...parsed.page });
};
