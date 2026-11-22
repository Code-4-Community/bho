import type { RouteHandler } from '../routes';
import { response } from '../response';
import { requireUser } from '../auth';
import { getDb } from '../db';
import { listUsers } from '../users';

// GET /me: the signed-in user
export const meHandler: RouteHandler = async (event) => {
  const user = await requireUser(event);
  return response(200, user);
};

// GET /users: every user (any signed-in user, any role)
export const usersHandler: RouteHandler = async (event) => {
  await requireUser(event);
  const users = await listUsers(getDb());
  return response(200, { users });
};
