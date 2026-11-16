import type { RouteHandler } from '../routes';
import { response } from '../response';
import { getCurrentUser } from '../auth';
import { getDb } from '../db';
import { getImport } from '../imports';

// imports.id is a Postgres integer, so larger ids would fail the query
const MAX_ID = 2_147_483_647;

// GET /imports/{id}
export const getImportHandler: RouteHandler = async (event) => {
  const user = await getCurrentUser(event);
  if (!user) return response(401, { message: 'Unauthorized' });

  const rawId = event.pathParameters?.id ?? '';
  const id = Number(rawId);
  if (!/^\d+$/.test(rawId) || id < 1 || id > MAX_ID) {
    return response(400, { message: 'id must be a positive integer' });
  }

  const found = await getImport(getDb(), id);
  if (!found) return response(404, { message: 'Import not found' });

  return response(200, found);
};
