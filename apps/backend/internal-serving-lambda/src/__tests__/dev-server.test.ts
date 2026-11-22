import { existsSync } from 'fs';
import { mkdtemp, readdir, readFile, rm } from 'fs/promises';
import type { AddressInfo } from 'net';
import { tmpdir } from 'os';
import { join } from 'path';
import { getCurrentUser } from '../auth';
import { devServer } from '../dev-server';

jest.mock('../auth');

let base: string;
let dir: string;
const env = process.env;

beforeAll(async () => {
  await new Promise<void>((resolve) =>
    devServer.listen(0, '127.0.0.1', resolve),
  );
  base = `http://127.0.0.1:${(devServer.address() as AddressInfo).port}`;
});

afterAll(
  () => new Promise<void>((resolve) => devServer.close(() => resolve())),
);

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'local-uploads-'));
  process.env = { ...env, LOCAL_UPLOAD_DIR: dir };
  jest.mocked(getCurrentUser).mockResolvedValue({
    id: 1,
    email: 'dev@example.com',
    role: 'ADMIN',
  });
});

afterEach(async () => {
  process.env = env;
  await rm(dir, { recursive: true, force: true });
});

const putCsv = (path: string, body: string, contentType = 'text/csv') =>
  fetch(base + path, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body,
  });

describe('dev server API', () => {
  it('calls the handler and adds CORS headers', async () => {
    const res = await fetch(`${base}/health`);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('fills pathParameters from the route template', async () => {
    const res = await fetch(`${base}/imports/abc`);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      message: 'id must be a positive integer',
    });
  });

  it('passes the query string', async () => {
    const res = await fetch(`${base}/imports?limit=0`);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      message: 'limit must be an integer from 1 to 100',
    });
  });

  it('lets the handler 404 a path with no route', async () => {
    expect((await fetch(`${base}/nope`)).status).toBe(404);
  });

  it('answers CORS preflight requests', async () => {
    const res = await fetch(`${base}/imports/upload-url/daily`, {
      method: 'OPTIONS',
    });

    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-headers')).toBe(
      'Authorization, Content-Type',
    );
  });
});

describe('dev server uploads', () => {
  it('saves a file PUT to the URL from POST /imports/upload-url/{kind}', async () => {
    const created = await fetch(`${base}/imports/upload-url/daily`, {
      method: 'POST',
      body: JSON.stringify({ fileName: 'obs.csv' }),
    });
    const { uploadUrl, s3Key } = await created.json();

    expect(created.status).toBe(200);
    expect(uploadUrl).toBe(`http://localhost:3000/local-uploads/${s3Key}`);

    const put = await putCsv(new URL(uploadUrl).pathname, 'a,b\n1,2');

    expect(put.status).toBe(200);
    expect(await readFile(join(dir, s3Key), 'utf-8')).toBe('a,b\n1,2');
  });

  it.each([
    ['outside the upload types', 'weekly/x.csv'],
    ['escaping the folder', 'daily/..%2F..%2Fescape.csv'],
  ])('rejects a key %s', async (_case, key) => {
    const res = await putCsv(`/local-uploads/${key}`, 'a,b');

    expect(res.status).toBe(400);
    expect(await readdir(dir)).toEqual([]);
    expect(existsSync(join(dir, '..', 'escape.csv'))).toBe(false);
  });

  it('rejects a file not sent as text/csv, like S3', async () => {
    const res = await putCsv('/local-uploads/daily/x.csv', 'a,b', 'text/plain');

    expect(res.status).toBe(403);
    expect(await readdir(dir)).toEqual([]);
  });
});
