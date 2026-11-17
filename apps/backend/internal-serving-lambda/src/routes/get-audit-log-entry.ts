import type { RouteHandler } from '../routes';
import { response } from '../response';
import { getCurrentUser } from '../auth';
import { getDb } from '../db';
import { getAuditLogEntry } from '../audit-log';
import { MAX_ID } from './get-import';

// GET /audit-log/{id}
export const getAuditLogEntryHandler: RouteHandler = async (event) => {
  const user = await getCurrentUser(event);
  if (!user) return response(401, { message: 'Unauthorized' });

  const rawId = event.pathParameters?.id ?? '';
  const id = Number(rawId);
  if (!/^\d+$/.test(rawId) || id < 1 || id > MAX_ID) {
    return response(400, { message: 'id must be a positive integer' });
  }

  const found = await getAuditLogEntry(getDb(), id);
  if (!found) {
    return response(404, { message: 'Audit log entry not found' });
  }

  return response(200, found);
};
