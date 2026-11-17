import type { APIGatewayProxyEvent } from 'aws-lambda';
import { listEntries } from '@bho/db-client';
import type { RouteHandler } from '../routes';
import { response } from '../response';
import { getCurrentUser } from '../auth';
import { getDb } from '../db';
import { addDays, daysBetween, parseDate } from '../dates';

export const DEFAULT_LIMIT = 25;
export const MAX_LIMIT = 100;
export const DEFAULT_DAYS = 31;
export const MAX_DAYS = 366;

const parseInteger = (value: string | undefined, fallback: number) =>
  value === undefined ? fallback : /^\d+$/.test(value) ? Number(value) : NaN;

// The cursor is the base64 date of the first item of the next page
export const encodeCursor = (date: string) =>
  Buffer.from(date, 'utf8').toString('base64url');
const decodeCursor = (cursor: string) =>
  parseDate(Buffer.from(cursor, 'base64url').toString('utf8'));

// Returns the parsed query, or a message describing the first invalid param
const parseQuery = (event: APIGatewayProxyEvent, today: string) => {
  const query = event.queryStringParameters ?? {};

  const limit = parseInteger(query.limit, DEFAULT_LIMIT);
  if (!(limit >= 1 && limit <= MAX_LIMIT)) {
    return `limit must be an integer from 1 to ${MAX_LIMIT}`;
  }

  const to = query.to === undefined ? today : parseDate(query.to);
  if (!to) return 'to must be a date as YYYY-MM-DD';
  const from =
    query.from === undefined
      ? addDays(to, 1 - DEFAULT_DAYS)
      : parseDate(query.from);
  if (!from) return 'from must be a date as YYYY-MM-DD';
  if (from > to) return 'from must not be after to';
  if (daysBetween(from, to) > MAX_DAYS) {
    return `from and to must be at most ${MAX_DAYS} days apart`;
  }

  const uploadedBy = parseInteger(query.uploadedBy, 0);
  if (query.uploadedBy !== undefined && !(uploadedBy >= 1)) {
    return 'uploadedBy must be a positive integer';
  }

  const cursor =
    query.cursor === undefined ? undefined : decodeCursor(query.cursor);
  if (query.cursor !== undefined && !cursor) return 'cursor is invalid';

  return {
    from,
    to,
    uploadedBy: query.uploadedBy === undefined ? undefined : uploadedBy,
    cursor,
    limit,
  };
};

// GET /entries?from&to&uploadedBy&limit&cursor
export const listEntriesHandler: RouteHandler = async (event) => {
  const user = await getCurrentUser(event);
  if (!user) return response(401, { message: 'Unauthorized' });

  const today = new Date().toISOString().slice(0, 10);
  const parsed = parseQuery(event, today);
  if (typeof parsed === 'string') return response(400, { message: parsed });
  const { from, to, uploadedBy, cursor, limit } = parsed;

  const rows = await listEntries(getDb(), { from, to, uploadedBy });
  const byDate = new Map(rows.map((row) => [row.date, row]));

  // One item per day, newest first. Filtering by uploader keeps only the days
  // that have a matching upload.
  const dates: string[] = [];
  if (uploadedBy === undefined) {
    for (let date = to; date >= from; date = addDays(date, -1)) {
      dates.push(date);
    }
  } else {
    dates.push(...byDate.keys());
  }

  const remaining = cursor ? dates.filter((date) => date <= cursor) : dates;
  const page = remaining.slice(0, limit);
  const next = remaining[limit];

  const items = page.map((date) => {
    const row = byDate.get(date);
    return row
      ? {
          date,
          status: 'Submitted',
          lastUploadedBy: `${row.uploadedByFirstName} ${row.uploadedByLastName}`,
          lastModifiedAt: row.uploadedAt,
          fileName: row.fileName,
          importId: row.importId,
        }
      : {
          date,
          status: 'Missing',
          lastUploadedBy: null,
          lastModifiedAt: null,
          fileName: null,
          importId: null,
        };
  });

  return response(200, {
    items,
    nextCursor: next === undefined ? null : encodeCursor(next),
    total: dates.length,
  });
};
