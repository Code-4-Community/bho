import type { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../handler';
import { getCurrentUser } from '../auth';
import { getDb } from '../db';
import { getAuditLogEntry } from '../audit-log';
import { getAuditLogEntryHandler } from '../routes/get-audit-log-entry';

jest.mock('../auth');
jest.mock('../db');
jest.mock('../audit-log', () => ({
  ...jest.requireActual('../audit-log'),
  getAuditLogEntry: jest.fn(),
}));

const db = { fake: 'db' };

const ENTRY = {
  id: 2,
  tableName: 'daily_observations',
  rowKey: { stationId: 1, date: '2026-10-26' },
  action: 'update',
  oldData: { stationId: 1, date: '2026-10-26', maxTempF: 61 },
  newData: { stationId: 1, date: '2026-10-26', maxTempF: 62 },
  changedBy: 1,
  importId: 7,
  changedAt: new Date('2026-10-26T12:00:00Z'),
};

const buildEvent = (id: string): APIGatewayProxyEvent =>
  ({
    httpMethod: 'GET',
    resource: '/audit-log/{id}',
    path: `/audit-log/${id}`,
    headers: {},
    pathParameters: { id },
    queryStringParameters: null,
    body: null,
  } as unknown as APIGatewayProxyEvent);

const call = async (id: string) => {
  const result = await getAuditLogEntryHandler(buildEvent(id));
  return { statusCode: result.statusCode, body: JSON.parse(result.body) };
};

describe('getAuditLogEntryHandler', () => {
  beforeEach(() => {
    jest.mocked(getCurrentUser).mockResolvedValue({ id: 'user-123' });
    jest.mocked(getDb).mockReturnValue(db as never);
    jest
      .mocked(getAuditLogEntry)
      .mockImplementation(async (_db, id) =>
        id === ENTRY.id ? (ENTRY as never) : undefined,
      );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns the entry, including the old and new data', async () => {
    const { statusCode, body } = await call('2');

    expect(statusCode).toBe(200);
    expect(body).toEqual(JSON.parse(JSON.stringify(ENTRY)));
  });

  it('returns changedAt as an ISO 8601 string', async () => {
    const { body } = await call('2');

    expect(body.changedAt).toBe('2026-10-26T12:00:00.000Z');
  });

  it('looks up the id as a number', async () => {
    await call('2');

    expect(getAuditLogEntry).toHaveBeenCalledWith(db, 2);
  });

  it('returns 404 for an unknown id', async () => {
    const { statusCode, body } = await call('999');

    expect(statusCode).toBe(404);
    expect(body).toEqual({ message: 'Audit log entry not found' });
  });

  it('accepts the largest Postgres integer', async () => {
    const { statusCode } = await call('2147483647');

    expect(statusCode).toBe(404);
    expect(getAuditLogEntry).toHaveBeenCalledWith(db, 2147483647);
  });

  it.each(['abc', '0', '-1', '1.5', '1e3', ' 2', '2147483648', ''])(
    'returns 400 for id %p',
    async (id) => {
      const { statusCode, body } = await call(id);

      expect(statusCode).toBe(400);
      expect(body).toEqual({ message: 'id must be a positive integer' });
      expect(getAuditLogEntry).not.toHaveBeenCalled();
    },
  );

  it('returns 401 without a signed-in user', async () => {
    jest.mocked(getCurrentUser).mockResolvedValue(null);

    const { statusCode, body } = await call('2');

    expect(statusCode).toBe(401);
    expect(body).toEqual({ message: 'Unauthorized' });
    expect(getAuditLogEntry).not.toHaveBeenCalled();
  });
});

describe('GET /audit-log/{id} through the lambda handler', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('routes to the get audit log entry handler', async () => {
    jest.mocked(getCurrentUser).mockResolvedValue({ id: 'user-123' });
    jest.mocked(getAuditLogEntry).mockResolvedValue(ENTRY as never);

    const result = await handler(buildEvent('2'));

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).id).toBe(2);
  });

  it('returns 500 when the query fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.mocked(getCurrentUser).mockResolvedValue({ id: 'user-123' });
    jest
      .mocked(getAuditLogEntry)
      .mockRejectedValue(new Error('connection refused'));

    const result = await handler(buildEvent('2'));

    expect(result.statusCode).toBe(500);
  });
});
