import { listEntryVersions } from '@bho/db-client';
import type { RouteHandler } from '../routes';
import { response } from '../response';
import { getCurrentUser } from '../auth';
import { parseDate } from '../dates';
import { toImportSummary } from '../entries';

// GET /entries/{date}/versions
export const listEntryVersionsHandler: RouteHandler = async (event) => {
  const user = await getCurrentUser(event);
  if (!user) return response(401, { message: 'Unauthorized' });

  const date = parseDate(event.pathParameters?.date);
  if (!date) return response(400, { message: 'date must be YYYY-MM-DD' });

  const { currentImportId, versions } = await listEntryVersions(date);
  if (currentImportId === null && versions.length === 0) {
    return response(404, { message: 'Entry not found' });
  }

  return response(200, {
    date,
    versions: versions.map((row) => ({
      ...toImportSummary(row),
      isCurrent: row.importId === currentImportId,
    })),
  });
};
