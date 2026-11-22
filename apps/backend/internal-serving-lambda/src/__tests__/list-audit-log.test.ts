import type { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../handler';
import { getCurrentUser } from '../auth';
import { getDb } from '../db';
import { listAuditLog } from '../audit-log';
import { listAuditLogHandler } from '../routes/list-audit-log';

jest.mock('../auth');
jest.mock('../db');
jest.mock('../audit-log', () => ({
  ...jest.requireActual('../audit-log'),
  listAuditLog: jest.fn(),
}));

const db = { fake: 'db' };

const ENTRIES = [
  {
    id: 2,
    tableName: 'daily_observations',
    rowKey: { stationId: 1, date: '2026-10-26' },
    action: 'update',
    oldData: { stationId: 1, date: '2026-10-26', maxTempF: 61 },
    newData: { stationId: 1, date: '2026-10-26', maxTempF: 62 },
    changedBy: 1,
    importId: 7,
    changedAt: new Date('2026-10-26T12:00:00Z'),
  },
  {
    id: 1,
    tableName: 'daily_records',
    rowKey: { stationId: 1, month: 10, day: 26 },
    action: 'insert',
    oldData: null,
    newData: { stationId: 1, month: 10, day: 26, highF: 80 },
    changedBy: null,
    importId: 3,
    changedAt: new Date('2026-10-25T09:30:00Z'),
  },
];

const buildEvent = (
  query: Record<string, string> | null = null,
): APIGatewayProxyEvent =>
  ({
    httpMethod: 'GET',
    resource: '/audit-log',
    path: '/audit-log',
    headers: {},
    pathParameters: null,
    queryStringParameters: query,
    body: null,
  } as unknown as APIGatewayProxyEvent);

const call = async (query: Record<string, string> | null = null) => {
  const result = await listAuditLogHandler(buildEvent(query));
  return { statusCode: result.statusCode, body: JSON.parse(result.body) };
};

describe('listAuditLogHandler', () => {
  beforeEach(() => {
    jest.mocked(getCurrentUser).mockResolvedValue({
      id: 7,
      email: 'dev@example.com',
      role: 'STANDARD',
    });
    jest.mocked(getDb).mockReturnValue(db as never);
    jest
      .mocked(listAuditLog)
      .mockResolvedValue({ items: ENTRIES, total: 2 } as never);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns the page of entries with the total and paging', async () => {
    const { statusCode, body } = await call();

    expect(statusCode).toBe(200);
    expect(body).toEqual({
      items: JSON.parse(JSON.stringify(ENTRIES)),
      total: 2,
      limit: 25,
      offset: 0,
    });
  });

  it('returns changedAt as an ISO 8601 string', async () => {
    const { body } = await call();

    expect(body.items[0].changedAt).toBe('2026-10-26T12:00:00.000Z');
  });

  it('defaults to no filters and the first 25 entries', async () => {
    await call();

    expect(listAuditLog).toHaveBeenCalledWith(
      db,
      {
        changedFrom: undefined,
        changedTo: undefined,
        tableName: undefined,
        importId: undefined,
        rowKey: undefined,
      },
      { limit: 25, offset: 0 },
    );
  });

  it('passes every filter and the paging through', async () => {
    const { body } = await call({
      changedFrom: '2026-10-01T00:00:00Z',
      changedTo: '2026-10-31T23:59:59.999Z',
      tableName: 'daily_observations',
      importId: '7',
      // API Gateway URL-decodes query strings before the lambda sees them
      rowKey: '{"stationId":1,"date":"2026-10-26"}',
      limit: '10',
      offset: '20',
    });

    expect(listAuditLog).toHaveBeenCalledWith(
      db,
      {
        changedFrom: new Date('2026-10-01T00:00:00Z'),
        changedTo: new Date('2026-10-31T23:59:59.999Z'),
        tableName: 'daily_observations',
        importId: 7,
        rowKey: { stationId: 1, date: '2026-10-26' },
      },
      { limit: 10, offset: 20 },
    );
    expect(body).toMatchObject({ limit: 10, offset: 20 });
  });

  it.each([
    'daily_observations',
    'hourly_observations',
    'scheduled_observations',
    'daily_records',
  ])('accepts tableName=%s', async (tableName) => {
    const { statusCode } = await call({ tableName });

    expect(statusCode).toBe(200);
    expect(jest.mocked(listAuditLog).mock.calls[0][1]).toMatchObject({
      tableName,
    });
  });

  it.each(['1', '2147483647'])('accepts importId=%s', async (importId) => {
    const { statusCode } = await call({ importId });

    expect(statusCode).toBe(200);
    expect(jest.mocked(listAuditLog).mock.calls[0][1]).toMatchObject({
      importId: Number(importId),
    });
  });

  it('accepts changedFrom equal to changedTo', async () => {
    const { statusCode } = await call({
      changedFrom: '2026-10-01T00:00:00Z',
      changedTo: '2026-10-01T00:00:00Z',
    });

    expect(statusCode).toBe(200);
  });

  it.each(['1', '100'])('accepts limit=%s', async (limit) => {
    const { statusCode } = await call({ limit });

    expect(statusCode).toBe(200);
  });

  it.each([
    ['limit', '0'],
    ['limit', '101'],
    ['limit', 'ten'],
    ['offset', '-1'],
    ['offset', 'abc'],
    ['changedFrom', '2026-10-01'],
    ['changedFrom', '2026-10-01T00:00:00-04:00'],
    ['changedFrom', '2026-13-01T00:00:00Z'],
    ['changedTo', 'yesterday'],
    ['tableName', 'audit_log'],
    ['tableName', 'users'],
    ['tableName', 'DAILY_RECORDS'],
    ['tableName', ''],
    ['importId', '0'],
    ['importId', '-1'],
    ['importId', '1.5'],
    ['importId', 'abc'],
    ['importId', '2147483648'],
    ['importId', ''],
    ['rowKey', 'stationId=1'],
    ['rowKey', '{"stationId":1'],
    ['rowKey', '[1]'],
    ['rowKey', '1'],
    ['rowKey', 'null'],
    ['rowKey', '"2026-10-26"'],
    ['rowKey', ''],
  ])('returns 400 for %s=%p', async (param, value) => {
    const { statusCode, body } = await call({ [param]: value });

    expect(statusCode).toBe(400);
    expect(body.message).toContain(param);
    expect(listAuditLog).not.toHaveBeenCalled();
  });

  it('returns 400 when changedFrom is after changedTo', async () => {
    const { statusCode, body } = await call({
      changedFrom: '2026-10-02T00:00:00Z',
      changedTo: '2026-10-01T00:00:00Z',
    });

    expect(statusCode).toBe(400);
    expect(body.message).toContain('changedFrom');
    expect(listAuditLog).not.toHaveBeenCalled();
  });

  it('returns 401 without a signed-in user', async () => {
    jest.mocked(getCurrentUser).mockResolvedValue(null);

    const { statusCode, body } = await call();

    expect(statusCode).toBe(401);
    expect(body).toEqual({ message: 'Unauthorized' });
    expect(listAuditLog).not.toHaveBeenCalled();
  });
});

describe('GET /audit-log through the lambda handler', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('routes to the list audit log handler', async () => {
    jest.mocked(getCurrentUser).mockResolvedValue({
      id: 7,
      email: 'dev@example.com',
      role: 'STANDARD',
    });
    jest.mocked(listAuditLog).mockResolvedValue({ items: [], total: 0 });

    const result = await handler(buildEvent());

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      items: [],
      total: 0,
      limit: 25,
      offset: 0,
    });
  });

  it('returns 500 when the query fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.mocked(getCurrentUser).mockResolvedValue({
      id: 7,
      email: 'dev@example.com',
      role: 'STANDARD',
    });
    jest
      .mocked(listAuditLog)
      .mockRejectedValue(new Error('connection refused'));

    const result = await handler(buildEvent());

    expect(result.statusCode).toBe(500);
  });
});
