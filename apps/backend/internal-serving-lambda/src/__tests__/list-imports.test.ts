import type { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../handler';
import { getCurrentUser } from '../auth';
import { getDb } from '../db';
import { listImports } from '../imports';
import { listImportsHandler } from '../routes/list-imports';

jest.mock('../auth');
jest.mock('../db');
jest.mock('../imports', () => ({
  ...jest.requireActual('../imports'),
  listImports: jest.fn(),
}));

const db = { fake: 'db' };

const IMPORTS = [
  {
    id: 2,
    kind: 'daily',
    fileName: 'July 2026.csv',
    s3Key: 'daily/2026-10-26/3f2b6c1e-8a4d-4b7e-9c2f-1d5e6a7b8c9d.csv',
    fileHash: 'b'.repeat(64),
    uploadedBy: 1,
    uploadedAt: new Date('2026-10-26T12:00:00Z'),
    status: 'failed',
  },
  {
    id: 1,
    kind: 'historical',
    fileName: 'All Daily Records.csv',
    s3Key: 'historical/2026-10-25/0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d.csv',
    fileHash: 'a'.repeat(64),
    uploadedBy: 1,
    uploadedAt: new Date('2026-10-25T09:30:00Z'),
    status: 'succeeded',
  },
];

const buildEvent = (
  query: Record<string, string> | null = null,
): APIGatewayProxyEvent =>
  ({
    httpMethod: 'GET',
    resource: '/imports',
    path: '/imports',
    headers: {},
    pathParameters: null,
    queryStringParameters: query,
    body: null,
  } as unknown as APIGatewayProxyEvent);

const call = async (query: Record<string, string> | null = null) => {
  const result = await listImportsHandler(buildEvent(query));
  return { statusCode: result.statusCode, body: JSON.parse(result.body) };
};

describe('listImportsHandler', () => {
  beforeEach(() => {
    jest.mocked(getCurrentUser).mockResolvedValue({ id: 'user-123' });
    jest.mocked(getDb).mockReturnValue(db as never);
    jest
      .mocked(listImports)
      .mockResolvedValue({ imports: IMPORTS, total: 2 } as never);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns the page of imports with the total and paging', async () => {
    const { statusCode, body } = await call();

    expect(statusCode).toBe(200);
    expect(body).toEqual({
      imports: JSON.parse(JSON.stringify(IMPORTS)),
      total: 2,
      limit: 25,
      offset: 0,
    });
  });

  it('returns uploadedAt as an ISO 8601 string', async () => {
    const { body } = await call();

    expect(body.imports[0].uploadedAt).toBe('2026-10-26T12:00:00.000Z');
  });

  it('defaults to no filters and the first 25 imports', async () => {
    await call();

    expect(listImports).toHaveBeenCalledWith(
      db,
      {
        kind: undefined,
        status: undefined,
        uploadedFrom: undefined,
        uploadedTo: undefined,
      },
      { limit: 25, offset: 0 },
    );
  });

  it('passes every filter and the paging through', async () => {
    const { body } = await call({
      kind: 'daily',
      status: 'failed',
      uploadedFrom: '2026-10-01T00:00:00Z',
      uploadedTo: '2026-10-31T23:59:59.999Z',
      limit: '10',
      offset: '20',
    });

    expect(listImports).toHaveBeenCalledWith(
      db,
      {
        kind: 'daily',
        status: 'failed',
        uploadedFrom: new Date('2026-10-01T00:00:00Z'),
        uploadedTo: new Date('2026-10-31T23:59:59.999Z'),
      },
      { limit: 10, offset: 20 },
    );
    expect(body).toMatchObject({ limit: 10, offset: 20 });
  });

  it.each([
    ['kind', 'historical'],
    ['status', 'succeeded'],
  ])('accepts %s=%s on its own', async (param, value) => {
    const { statusCode } = await call({ [param]: value });

    expect(statusCode).toBe(200);
    expect(jest.mocked(listImports).mock.calls[0][1]).toMatchObject({
      [param]: value,
    });
  });

  it('accepts uploadedFrom equal to uploadedTo', async () => {
    const { statusCode } = await call({
      uploadedFrom: '2026-10-01T00:00:00Z',
      uploadedTo: '2026-10-01T00:00:00Z',
    });

    expect(statusCode).toBe(200);
  });

  it.each(['1', '100'])('accepts limit=%s', async (limit) => {
    const { statusCode } = await call({ limit });

    expect(statusCode).toBe(200);
  });

  it.each([
    ['kind', 'weekly'],
    ['kind', 'DAILY'],
    ['status', 'pending'],
    ['limit', '0'],
    ['limit', '101'],
    ['limit', '1.5'],
    ['limit', 'ten'],
    ['limit', ''],
    ['offset', '-1'],
    ['offset', 'abc'],
    ['uploadedFrom', '2026-10-01'],
    ['uploadedFrom', '2026-10-01T00:00:00-04:00'],
    ['uploadedFrom', '2026-13-01T00:00:00Z'],
    ['uploadedFrom', 'yesterday'],
    ['uploadedTo', '2026-10-31'],
  ])('returns 400 for %s=%p', async (param, value) => {
    const { statusCode, body } = await call({ [param]: value });

    expect(statusCode).toBe(400);
    expect(body.message).toContain(param);
    expect(listImports).not.toHaveBeenCalled();
  });

  it('returns 400 when uploadedFrom is after uploadedTo', async () => {
    const { statusCode, body } = await call({
      uploadedFrom: '2026-10-02T00:00:00Z',
      uploadedTo: '2026-10-01T00:00:00Z',
    });

    expect(statusCode).toBe(400);
    expect(body.message).toContain('uploadedFrom');
    expect(listImports).not.toHaveBeenCalled();
  });

  it('returns 401 without a signed-in user', async () => {
    jest.mocked(getCurrentUser).mockResolvedValue(null);

    const { statusCode, body } = await call();

    expect(statusCode).toBe(401);
    expect(body).toEqual({ message: 'Unauthorized' });
    expect(listImports).not.toHaveBeenCalled();
  });
});

describe('GET /imports through the lambda handler', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('routes to the list imports handler', async () => {
    jest.mocked(getCurrentUser).mockResolvedValue({ id: 'user-123' });
    jest.mocked(listImports).mockResolvedValue({ imports: [], total: 0 });

    const result = await handler(buildEvent());

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      imports: [],
      total: 0,
      limit: 25,
      offset: 0,
    });
  });

  it('returns 500 when the query fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.mocked(getCurrentUser).mockResolvedValue({ id: 'user-123' });
    jest.mocked(listImports).mockRejectedValue(new Error('connection refused'));

    const result = await handler(buildEvent());

    expect(result.statusCode).toBe(500);
  });
});
