import { Kysely, sql } from 'kysely';

// Documented in docs/database-schema.md. No FK to daily_observations: staff can
// post a discussion before that day's sheet is uploaded.
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('daily_discussions')
    .addColumn('stationId', 'integer', (col) =>
      col.notNull().references('stations.id'),
    )
    .addColumn('date', 'date', (col) => col.notNull())
    .addColumn('content', 'text', (col) => col.notNull())
    .addColumn('banner', 'text')
    .addColumn('updatedAt', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addPrimaryKeyConstraint('daily_discussions_pkey', ['stationId', 'date'])
    .execute();

  await sql`
    CREATE TRIGGER daily_discussions_audit
    AFTER INSERT OR UPDATE OR DELETE ON daily_discussions
    FOR EACH ROW EXECUTE FUNCTION audit_row('stationId', 'date')
  `.execute(db);
}

// Forward-only: no rollback; see db/README.md.
export async function down(_db: Kysely<any>): Promise<void> {}
