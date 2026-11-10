import { execSync } from 'child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { closeConnection, recordImport } from '@bho/db-client';
import { Client } from 'pg';
import { parseDaily } from '../parsers/daily';
import { writeDaily } from './writeDaily';

// Creates its own empty database, migrates it, uploads daily.csv (nothing is
// stored, so every row is new), then daily_diff.csv (three numbers changed) and
// checks the diff between them. It writes that diff to tmp/daily-diff.json and
// drops the database afterwards. Skipped unless DB_INTEGRATION=1, and needs a
// running Postgres (see db/README.md). From the repo root:
//   DB_INTEGRATION=1 npx jest -c apps/backend/upload-lambda/jest.config.js writeDaily
// It connects with DB_HOST/DB_PORT/DB_USER/DB_PASSWORD, defaulting to the
// docker-compose values (127.0.0.1:5432, postgres/password).
const enabled = process.env.DB_INTEGRATION === '1';
const connection = {
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 5432),
  user: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'password',
};
const database = `bho_it_${Date.now()}`;

const fixture = (name: string) => {
  const parsed = parseDaily(
    readFileSync(join(__dirname, '../parsers/__fixtures__', name), 'utf8'),
  );
  if (parsed.ok === false) throw new Error(`${name} should parse`);
  return parsed.rows;
};

(enabled ? describe : describe.skip)('writeDaily (empty Postgres)', () => {
  const admin = new Client({ ...connection, database: 'postgres' });
  let options: { stationId: number; userId: number };
  const upload = async (name: string) =>
    writeDaily(fixture(name), {
      ...options,
      importId: await recordImport({
        kind: 'daily',
        fileName: name,
        s3Key: `uploads/${name}`,
        fileHash: name,
        uploadedBy: options.userId,
        status: 'succeeded',
      }),
    });

  beforeAll(async () => {
    await admin.connect();
    await admin.query(`CREATE DATABASE ${database}`);
    // The migration also inserts the station.
    execSync('yarn -s db:migrate', {
      cwd: join(__dirname, '../../../../../db'),
      env: { ...process.env, ...envFor(database) },
      stdio: 'pipe',
    });
    const db = new Client({ ...connection, database });
    await db.connect();
    const station = await db.query('SELECT id FROM stations LIMIT 1');
    const user = await db.query(
      `INSERT INTO users (email, "firstName", "lastName", status)
       VALUES ('it@example.com', 'It', 'Test', 'ADMIN') RETURNING id`,
    );
    await db.end();
    options = { stationId: station.rows[0].id, userId: user.rows[0].id };
    Object.assign(process.env, envFor(database));
  }, 120_000);

  afterAll(async () => {
    await closeConnection();
    await admin.query(`DROP DATABASE IF EXISTS ${database} WITH (FORCE)`);
    await admin.end();
  });

  it('has nothing to compare on the first upload, so every row is added', async () => {
    const days = fixture('daily.csv');
    const total = days.reduce(
      (sum, d) => sum + 1 + d.hourly.length + d.scheduled.length,
      0,
    );

    const { counts, changes } = await upload('daily.csv');

    expect(counts).toEqual({
      inserted: total,
      updated: 0,
      unchanged: 0,
      deleted: 0,
    });
    expect(changes).toHaveLength(total);
    expect(changes.every((c) => c.type === 'added')).toBe(true);
  });

  it('shows exactly the numbers that changed in the second upload', async () => {
    const { counts, changes } = await upload('daily_diff.csv');

    expect(changes).toEqual([
      {
        date: '2026-07-01',
        table: 'daily',
        key: '2026-07-01',
        type: 'changed',
        field: 'maxTempF',
        old: 95,
        new: 97,
      },
      {
        date: '2026-07-01',
        table: 'hourly',
        key: '0',
        type: 'changed',
        field: 'tempF',
        old: 68,
        new: 70,
      },
      {
        date: '2026-07-01',
        table: 'scheduled',
        key: '07:00',
        type: 'changed',
        field: 'dryBulbF',
        old: '72.2',
        new: '73.4',
      },
    ]);
    expect(counts).toMatchObject({ inserted: 0, updated: 3, deleted: 0 });

    const out = join(__dirname, '../../tmp/daily-diff.json');
    mkdirSync(join(out, '..'), { recursive: true });
    writeFileSync(out, JSON.stringify({ counts, changes }, null, 2));
  });

  it('sees the second upload again as unchanged', async () => {
    const { counts, changes } = await upload('daily_diff.csv');

    expect(changes).toEqual([]);
    expect(counts).toMatchObject({ inserted: 0, updated: 0, deleted: 0 });
  });
});

function envFor(name: string) {
  return {
    DB_HOST: connection.host,
    DB_PORT: String(connection.port),
    DB_USER: connection.user,
    DB_PASSWORD: connection.password,
    DB_NAME: name,
  };
}
