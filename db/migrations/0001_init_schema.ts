import { Kysely, sql } from 'kysely';

// Tables, columns, and sources are documented in docs/database-schema.md.
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('users')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('email', 'text', (col) => col.notNull().unique())
    .addColumn('firstName', 'text', (col) => col.notNull())
    .addColumn('lastName', 'text', (col) => col.notNull())
    .addColumn('status', 'text', (col) => col.notNull())
    .execute();

  await db.schema
    .createTable('stations')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('code', 'text', (col) => col.notNull().unique())
    .execute();

  await db.insertInto('stations').values({ code: '19737-02' }).execute();

  await db.schema
    .createTable('imports')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('kind', 'text', (col) => col.notNull())
    .addColumn('fileName', 'text', (col) => col.notNull())
    .addColumn('s3Key', 'text', (col) => col.notNull())
    .addColumn('fileHash', 'text', (col) => col.notNull())
    .addColumn('uploadedBy', 'integer', (col) =>
      col.notNull().references('users.id'),
    )
    .addColumn('uploadedAt', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('status', 'text', (col) => col.notNull())
    .addColumn('errors', 'jsonb')
    .execute();

  await db.schema
    .createTable('daily_observations')
    .addColumn('stationId', 'integer', (col) =>
      col.notNull().references('stations.id'),
    )
    .addColumn('date', 'date', (col) => col.notNull())
    .addColumn('maxTempF', 'smallint')
    .addColumn('minTempF', 'smallint')
    .addColumn('avgTempF', 'numeric')
    .addColumn('normalTempF', 'smallint')
    .addColumn('precipIn', 'numeric')
    .addColumn('precipTrace', 'boolean', (col) => col.notNull())
    .addColumn('snowfallIn', 'numeric')
    .addColumn('snowDepthIn', 'numeric')
    .addColumn('sunshineMin', 'smallint')
    .addColumn('sunshinePossibleMin', 'smallint')
    .addColumn('sunshinePct', 'smallint')
    .addColumn('fastestMileMph', 'smallint')
    .addColumn('fastestMileDir', 'varchar(3)')
    .addColumn('fastestMileTime', 'time')
    .addColumn('peakGustKts', 'smallint')
    .addColumn('peakGustDir', 'varchar(3)')
    .addColumn('peakGustTime', 'time')
    .addColumn('avgStationPressureMb', 'numeric')
    .addColumn('sunrise', 'time')
    .addColumn('sunset', 'time')
    .addColumn('observerInitials', 'text')
    .addColumn('remarks', 'text')
    .addColumn('importId', 'integer', (col) =>
      col.notNull().references('imports.id'),
    )
    .addPrimaryKeyConstraint('daily_observations_pkey', ['stationId', 'date'])
    .execute();

  await db.schema
    .createTable('hourly_observations')
    .addColumn('stationId', 'integer', (col) => col.notNull())
    .addColumn('date', 'date', (col) => col.notNull())
    .addColumn('hour', 'smallint', (col) => col.notNull())
    .addColumn('tempF', 'smallint')
    .addColumn('precipIn', 'numeric')
    .addColumn('precipTrace', 'boolean', (col) => col.notNull())
    .addColumn('windDir', 'varchar(3)')
    .addColumn('windSpeedMph', 'smallint')
    .addColumn('sunshineMin', 'smallint')
    .addColumn('skyCover', 'smallint')
    .addColumn('visibilityMi', 'numeric')
    .addColumn('presentWeather', 'text')
    .addColumn('humidityPct', 'smallint')
    .addColumn('mountainVis', 'text')
    .addColumn('remarks', 'text')
    .addPrimaryKeyConstraint('hourly_observations_pkey', [
      'stationId',
      'date',
      'hour',
    ])
    .addForeignKeyConstraint(
      'hourly_observations_day_fkey',
      ['stationId', 'date'],
      'daily_observations',
      ['stationId', 'date'],
      (fk) => fk.onDelete('cascade'),
    )
    .execute();

  await db.schema
    .createTable('scheduled_observations')
    .addColumn('stationId', 'integer', (col) => col.notNull())
    .addColumn('date', 'date', (col) => col.notNull())
    .addColumn('obsTime', 'time', (col) => col.notNull())
    .addColumn('stationPressureIn', 'numeric')
    .addColumn('attachedThermC', 'numeric')
    .addColumn('observedBarometerMb', 'numeric')
    .addColumn('pressureCorrectionMb', 'numeric')
    .addColumn('dryBulbF', 'numeric')
    .addColumn('wetBulbF', 'numeric')
    .addColumn('dewpointF', 'smallint')
    .addColumn('humidityPct', 'smallint')
    .addColumn('maxTempF', 'smallint')
    .addColumn('minTempF', 'smallint')
    .addColumn('precipIn', 'numeric')
    .addColumn('precipTrace', 'boolean', (col) => col.notNull())
    .addColumn('snowfallIn', 'numeric')
    .addColumn('snowDepthIn', 'numeric')
    .addColumn('vaporPressureMb', 'numeric')
    .addPrimaryKeyConstraint('scheduled_observations_pkey', [
      'stationId',
      'date',
      'obsTime',
    ])
    .addForeignKeyConstraint(
      'scheduled_observations_day_fkey',
      ['stationId', 'date'],
      'daily_observations',
      ['stationId', 'date'],
      (fk) => fk.onDelete('cascade'),
    )
    .execute();

  await db.schema
    .createTable('daily_records')
    .addColumn('stationId', 'integer', (col) =>
      col.notNull().references('stations.id'),
    )
    .addColumn('month', 'smallint', (col) => col.notNull())
    .addColumn('day', 'smallint', (col) => col.notNull())
    .addColumn('highF', 'smallint')
    .addColumn('highYears', sql`smallint[]`)
    .addColumn('lowF', 'smallint')
    .addColumn('lowYears', sql`smallint[]`)
    .addColumn('precipIn', 'numeric')
    .addColumn('precipYears', sql`smallint[]`)
    .addColumn('snowIn', 'numeric')
    .addColumn('snowYears', sql`smallint[]`)
    .addColumn('peakGustMph', 'smallint')
    .addColumn('peakGustDir', 'varchar(3)')
    .addColumn('peakGustIsEstimated', 'boolean', (col) => col.notNull())
    .addColumn('peakGustYears', sql`smallint[]`)
    .addColumn('notes', 'text')
    .addColumn('importId', 'integer', (col) =>
      col.notNull().references('imports.id'),
    )
    .addPrimaryKeyConstraint('daily_records_pkey', [
      'stationId',
      'month',
      'day',
    ])
    .execute();

  await db.schema
    .createType('audit_log_action')
    .asEnum(['insert', 'update', 'delete'])
    .execute();

  await db.schema
    .createTable('audit_log')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('tableName', 'text', (col) => col.notNull())
    .addColumn('rowKey', 'jsonb', (col) => col.notNull())
    .addColumn('action', sql`audit_log_action`, (col) => col.notNull())
    .addColumn('oldData', 'jsonb')
    .addColumn('newData', 'jsonb')
    .addColumn('changedBy', 'integer', (col) => col.references('users.id'))
    .addColumn('importId', 'integer', (col) => col.references('imports.id'))
    .addColumn('changedAt', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  // Trigger arguments are the table's primary key columns, used for rowKey.
  // Writers identify themselves with set_config('app.user_id' / 'app.import_id',
  // ..., true) inside their transaction; hourly and scheduled rows have no
  // importId column, so the row itself can't say which import wrote it.
  await sql`
    CREATE FUNCTION audit_row() RETURNS trigger AS $$
    DECLARE
      rec jsonb := to_jsonb(CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END);
      key jsonb := '{}';
      col text;
    BEGIN
      FOREACH col IN ARRAY TG_ARGV LOOP
        key := key || jsonb_build_object(col, rec -> col);
      END LOOP;

      INSERT INTO audit_log ("tableName", "rowKey", action, "oldData", "newData", "changedBy", "importId")
      VALUES (
        TG_TABLE_NAME,
        key,
        lower(TG_OP)::audit_log_action,
        CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
        CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END,
        nullif(current_setting('app.user_id', true), '')::int,
        nullif(current_setting('app.import_id', true), '')::int
      );
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql
  `.execute(db);

  const audited: [string, string[]][] = [
    ['daily_observations', ['stationId', 'date']],
    ['hourly_observations', ['stationId', 'date', 'hour']],
    ['scheduled_observations', ['stationId', 'date', 'obsTime']],
    ['daily_records', ['stationId', 'month', 'day']],
  ];
  for (const [table, key] of audited) {
    await sql`
      CREATE TRIGGER ${sql.id(`${table}_audit`)}
      AFTER INSERT OR UPDATE OR DELETE ON ${sql.table(table)}
      FOR EACH ROW EXECUTE FUNCTION audit_row(${sql.raw(
        key.map((col) => `'${col}'`).join(', '),
      )})
    `.execute(db);
  }
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('audit_log').execute();
  await db.schema.dropType('audit_log_action').execute();
  await db.schema.dropTable('daily_records').execute();
  await db.schema.dropTable('scheduled_observations').execute();
  await db.schema.dropTable('hourly_observations').execute();
  await db.schema.dropTable('daily_observations').execute();
  await sql`DROP FUNCTION audit_row()`.execute(db);
  await db.schema.dropTable('imports').execute();
  await db.schema.dropTable('stations').execute();
  await db.schema.dropTable('users').execute();
}
