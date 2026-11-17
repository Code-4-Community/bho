import type { APIGatewayProxyEvent } from 'aws-lambda';
import { listEntries } from '@bho/db-client';
import { getCurrentUser } from '../auth';
import { getDb } from '../db';
import { encodeCursor, listEntriesHandler } from '../routes/list-entries';

jest.mock('../auth');
jest.mock('../db');
jest.mock('@bho/db-client', () => ({ listEntries: jest.fn() }));

const db = { fake: 'db' };

const row = (date: string, importId: number, uploadedById = 1) => ({
  date,
  importId,
  fileName: `${date}.csv`,
  importStatus: 'succeeded',
  uploadedAt: new Date(`${date}T12:00:00Z`),
  uploadedById,
  uploadedByFirstName: 'Ada',
  uploadedByLastName: 'Lovelace',
});

const buildEvent = (query: Record<string, string> | null = null) =>
  ({
    httpMethod: 'GET',
    resource: '/entries',
    path: '/entries',
    headers: {},
    pathParameters: null,
    queryStringParameters: query,
    body: null,
  } as unknown as APIGatewayProxyEvent);

const call = async (query: Record<string, string> | null = null) => {
  const result = await listEntriesHandler(buildEvent(query));
  return { statusCode: result.statusCode, body: JSON.parse(result.body) };
};

describe('listEntriesHandler', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-10T15:00:00Z'));
    jest.mocked(getCurrentUser).mockResolvedValue({ id: 'user-123' });
    jest.mocked(getDb).mockReturnValue(db as never);
    jest.mocked(listEntries).mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it('defaults to the last 31 days ending today', async () => {
    await call();

    expect(listEntries).toHaveBeenCalledWith(db, {
      from: '2026-06-10',
      to: '2026-07-10',
      uploadedBy: undefined,
    });
  });

  it('returns one item per day, newest first, including days with no data', async () => {
    jest
      .mocked(listEntries)
      .mockResolvedValue([row('2026-07-09', 5), row('2026-07-07', 4)]);

    const { statusCode, body } = await call({
      from: '2026-07-07',
      to: '2026-07-10',
    });

    expect(statusCode).toBe(200);
    expect(body.total).toBe(4);
    expect(body.nextCursor).toBeNull();
    expect(body.items).toEqual([
      {
        date: '2026-07-10',
        status: 'Missing',
        lastUploadedBy: null,
        lastModifiedAt: null,
        fileName: null,
        importId: null,
      },
      {
        date: '2026-07-09',
        status: 'Submitted',
        lastUploadedBy: 'Ada Lovelace',
        lastModifiedAt: '2026-07-09T12:00:00.000Z',
        fileName: '2026-07-09.csv',
        importId: 5,
      },
      expect.objectContaining({ date: '2026-07-08', status: 'Missing' }),
      expect.objectContaining({ date: '2026-07-07', importId: 4 }),
    ]);
  });

  it('returns an empty page for an uploader with no days', async () => {
    const { statusCode, body } = await call({ uploadedBy: '9' });

    expect(statusCode).toBe(200);
    expect(body).toEqual({ items: [], nextCursor: null, total: 0 });
    expect(listEntries).toHaveBeenCalledWith(db, {
      from: '2026-06-10',
      to: '2026-07-10',
      uploadedBy: 9,
    });
  });

  it('lists only the uploader’s days when filtering by uploadedBy', async () => {
    jest.mocked(listEntries).mockResolvedValue([row('2026-07-09', 5, 2)]);

    const { body } = await call({ uploadedBy: '2' });

    expect(body.total).toBe(1);
    expect(body.items.map((i: { date: string }) => i.date)).toEqual([
      '2026-07-09',
    ]);
  });

  it('pages with an opaque cursor and ends with a null nextCursor', async () => {
    const query = { from: '2026-07-01', to: '2026-07-05', limit: '2' };

    const first = (await call(query)).body;
    expect(first.items.map((i: { date: string }) => i.date)).toEqual([
      '2026-07-05',
      '2026-07-04',
    ]);
    expect(first.nextCursor).toBe(encodeCursor('2026-07-03'));
    expect(first.total).toBe(5);

    const second = (await call({ ...query, cursor: first.nextCursor })).body;
    expect(second.items.map((i: { date: string }) => i.date)).toEqual([
      '2026-07-03',
      '2026-07-02',
    ]);

    const third = (await call({ ...query, cursor: second.nextCursor })).body;
    expect(third.items.map((i: { date: string }) => i.date)).toEqual([
      '2026-07-01',
    ]);
    expect(third.nextCursor).toBeNull();
  });

  it.each([
    [{ from: '2026-02-30' }, 'from must be a date'],
    [{ to: 'tomorrow' }, 'to must be a date'],
    [{ from: '2026-07-10', to: '2026-07-01' }, 'from must not be after to'],
    [{ from: '2024-01-01', to: '2026-07-01' }, 'at most 366 days'],
    [{ uploadedBy: 'abc' }, 'uploadedBy must be a positive integer'],
    [{ uploadedBy: '0' }, 'uploadedBy must be a positive integer'],
    [{ limit: '0' }, 'limit must be an integer'],
    [{ limit: '101' }, 'limit must be an integer'],
    [{ cursor: 'not-a-cursor' }, 'cursor is invalid'],
  ])('rejects invalid params %j', async (query, message) => {
    const { statusCode, body } = await call(query);

    expect(statusCode).toBe(400);
    expect(body.message).toContain(message);
    expect(listEntries).not.toHaveBeenCalled();
  });

  it('returns 401 without a user', async () => {
    jest.mocked(getCurrentUser).mockResolvedValue(null);

    const { statusCode } = await call();

    expect(statusCode).toBe(401);
    expect(listEntries).not.toHaveBeenCalled();
  });
});
