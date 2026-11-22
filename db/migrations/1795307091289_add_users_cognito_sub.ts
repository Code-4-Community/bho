import type { Kysely } from 'kysely';

// Links a user row to its Cognito identity (the JWT `sub` claim). Nullable so
// a user can be added by email before their first sign-in; Postgres allows
// many NULLs under a unique constraint.
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('users')
    .addColumn('cognitoSub', 'text', (col) => col.unique())
    .execute();
}

// Forward-only: no rollback; see db/README.md.
export async function down(_db: Kysely<any>): Promise<void> {}
