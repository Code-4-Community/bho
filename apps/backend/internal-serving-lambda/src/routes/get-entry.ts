import { getEntry } from '@bho/db-client';
import type { RouteHandler } from '../routes';
import { response } from '../response';
import { getCurrentUser } from '../auth';
import { getDb } from '../db';
import { parseDate } from '../dates';
import { toImportSummary } from '../entries';

// GET /entries/{date}
export const getEntryHandler: RouteHandler = async (event) => {
  const user = await getCurrentUser(event);
  if (!user) return response(401, { message: 'Unauthorized' });

  const date = parseDate(event.pathParameters?.date);
  if (!date) return response(400, { message: 'date must be YYYY-MM-DD' });

  const entry = await getEntry(getDb(), date);
  if (!entry) return response(404, { message: 'Entry not found' });

  const { summary, hourly, scheduled, currentImport } = entry;
  return response(200, {
    date,
    summary,
    hourly,
    scheduled,
    currentImport: toImportSummary(currentImport),
  });
};
