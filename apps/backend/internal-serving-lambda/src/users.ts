import type { Kysely } from 'kysely';
import type { Database } from '@bho/db-client';
import type { UserRole } from './auth';

export interface UserSummary {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

// Every user, oldest first.
export const listUsers = async (
  db: Kysely<Database>,
): Promise<UserSummary[]> => {
  const rows = await db
    .selectFrom('users')
    .select(['id', 'email', 'firstName', 'lastName', 'status'])
    .orderBy('id')
    .execute();

  // users.status holds the role; see docs/database-schema.md.
  return rows.map(({ status, ...user }) => ({
    ...user,
    role: status as UserRole,
  }));
};
