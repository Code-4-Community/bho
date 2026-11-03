import type { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../handler';
import { getCurrentUser } from '../auth';
import { getDb } from '../db';
import { getImport } from '../imports';
import { getImportHandler } from '../routes/get-import';

jest.mock('../auth');
jest.mock('../db');
jest.mock('../imports', () => ({
  ...jest.requireActual('../imports'),
  getImport: jest.fn(),
}));

const db = { fake: 'db' };

const IMPORT = {
  id: 2,
  kind: 'daily',
  fileName: 'July 2026.csv',
  s3Key: 'daily/2026-10-26/3f2b6c1e-8a4d-4b7e-9c2f-1d5e6a7b8c9d.csv',
  fileHash: 'b'.repeat(64),
  uploadedBy: 1,
  uploadedAt: new Date('2026-10-26T12:00:00Z'),
  status: 'failed',
  errors: [
    { row: 14, message: 'Max temp is not a number' },
    { row: 31, message: 'Missing date' },
  ],
};

const buildEvent = (id: string): APIGatewayProxyEvent =>
  ({
    httpMethod: 'GET',
    resource: '/imports/{id}',
    path: `/imports/${id}`,
    headers: {},
    pathParameters: { id },
    queryStringParameters: null,
    body: null,
  } as unknown as APIGatewayProxyEvent);

const call = async (id: string) => {
  const result = await getImportHandler(buildEvent(id));
  return { statusCode: result.statusCode, body: JSON.parse(result.body) };
};

describe('getImportHandler', () => {
  beforeEach(() => {
    jest.mocked(getCurrentUser).mockResolvedValue({ id: 'user-123' });
    jest.mocked(getDb).mockReturnValue(db as never);
    jest
      .mocked(getImport)
      .mockImplementation(async (_db, id) =>
        id === IMPORT.id ? (IMPORT as never) : undefined,
      );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns the import, including its errors', async () => {
    const { statusCode, body } = await call('2');

    expect(statusCode).toBe(200);
    expect(body).toEqual(JSON.parse(JSON.stringify(IMPORT)));
    expect(body.errors).toHaveLength(2);
  });

  it('returns uploadedAt as an ISO 8601 string', async () => {
    const { body } = await call('2');

    expect(body.uploadedAt).toBe('2026-10-26T12:00:00.000Z');
  });

  it('looks up the id as a number', async () => {
    await call('2');

    expect(getImport).toHaveBeenCalledWith(db, 2);
  });

  it('returns 404 for an unknown id', async () => {
    const { statusCode, body } = await call('999');

    expect(statusCode).toBe(404);
    expect(body).toEqual({ message: 'Import not found' });
  });

  it('accepts the largest Postgres integer', async () => {
    const { statusCode } = await call('2147483647');

    expect(statusCode).toBe(404);
    expect(getImport).toHaveBeenCalledWith(db, 2147483647);
  });

  it.each(['abc', '0', '-1', '1.5', '1e3', ' 2', '2147483648', ''])(
    'returns 400 for id %p',
    async (id) => {
      const { statusCode, body } = await call(id);

      expect(statusCode).toBe(400);
      expect(body).toEqual({ message: 'id must be a positive integer' });
      expect(getImport).not.toHaveBeenCalled();
    },
  );

  it('returns 401 without a signed-in user', async () => {
    jest.mocked(getCurrentUser).mockResolvedValue(null);

    const { statusCode, body } = await call('2');

    expect(statusCode).toBe(401);
    expect(body).toEqual({ message: 'Unauthorized' });
    expect(getImport).not.toHaveBeenCalled();
  });
});

describe('GET /imports/{id} through the lambda handler', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('routes to the get import handler', async () => {
    jest.mocked(getCurrentUser).mockResolvedValue({ id: 'user-123' });
    jest.mocked(getImport).mockResolvedValue(IMPORT as never);

    const result = await handler(buildEvent('2'));

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).id).toBe(2);
  });

  it('returns 500 when the query fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.mocked(getCurrentUser).mockResolvedValue({ id: 'user-123' });
    jest.mocked(getImport).mockRejectedValue(new Error('connection refused'));

    const result = await handler(buildEvent('2'));

    expect(result.statusCode).toBe(500);
  });
});
