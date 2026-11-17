import type { APIGatewayProxyEvent } from 'aws-lambda';
import { listEntryVersions } from '@bho/db-client';
import { getCurrentUser } from '../auth';
import { getDb } from '../db';
import { listEntryVersionsHandler } from '../routes/list-entry-versions';

jest.mock('../auth');
jest.mock('../db');
jest.mock('@bho/db-client', () => ({ listEntryVersions: jest.fn() }));

const db = { fake: 'db' };

const version = (importId: number, uploadedAt: string) => ({
  importId,
  fileName: `upload-${importId}.csv`,
  importStatus: 'succeeded',
  uploadedAt: new Date(uploadedAt),
  uploadedById: 1,
  uploadedByFirstName: 'Ada',
  uploadedByLastName: 'Lovelace',
});

const call = async (date: string) => {
  const event = {
    httpMethod: 'GET',
    resource: '/entries/{date}/versions',
    path: `/entries/${date}/versions`,
    headers: {},
    pathParameters: { date },
    queryStringParameters: null,
    body: null,
  } as unknown as APIGatewayProxyEvent;
  const result = await listEntryVersionsHandler(event);
  return { statusCode: result.statusCode, body: JSON.parse(result.body) };
};

describe('listEntryVersionsHandler', () => {
  beforeEach(() => {
    jest.mocked(getCurrentUser).mockResolvedValue({ id: 'user-123' });
    jest.mocked(getDb).mockReturnValue(db as never);
    jest.mocked(listEntryVersions).mockResolvedValue({
      currentImportId: 7,
      versions: [
        version(7, '2026-07-10T09:00:00Z'),
        version(3, '2026-07-09T09:00:00Z'),
      ],
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns every version in the order given, marking the current one', async () => {
    const { statusCode, body } = await call('2026-07-09');

    expect(statusCode).toBe(200);
    expect(listEntryVersions).toHaveBeenCalledWith(db, '2026-07-09');
    expect(body.date).toBe('2026-07-09');
    expect(
      body.versions.map((v: { id: number; isCurrent: boolean }) => [
        v.id,
        v.isCurrent,
      ]),
    ).toEqual([
      [7, true],
      [3, false],
    ]);
    expect(body.versions[0]).toEqual({
      id: 7,
      fileName: 'upload-7.csv',
      status: 'succeeded',
      uploadedAt: '2026-07-10T09:00:00.000Z',
      uploadedBy: { id: 1, name: 'Ada Lovelace' },
      isCurrent: true,
    });
  });

  it('returns the versions of a day whose current import is not listed', async () => {
    jest.mocked(listEntryVersions).mockResolvedValue({
      currentImportId: 9,
      versions: [version(3, '2026-07-09T09:00:00Z')],
    });

    const { body } = await call('2026-07-09');

    expect(body.versions[0].isCurrent).toBe(false);
  });

  it('returns 404 when the date has no entry and no history', async () => {
    jest
      .mocked(listEntryVersions)
      .mockResolvedValue({ currentImportId: null, versions: [] });

    const { statusCode, body } = await call('2026-07-01');

    expect(statusCode).toBe(404);
    expect(body).toEqual({ message: 'Entry not found' });
  });

  it('still lists the history of a day whose entry was removed', async () => {
    jest.mocked(listEntryVersions).mockResolvedValue({
      currentImportId: null,
      versions: [version(3, '2026-07-09T09:00:00Z')],
    });

    const { statusCode, body } = await call('2026-07-09');

    expect(statusCode).toBe(200);
    expect(body.versions).toHaveLength(1);
  });

  it.each(['abc', '2026-02-30', '20260709'])(
    'returns 400 for the invalid date %s',
    async (date) => {
      const { statusCode } = await call(date);

      expect(statusCode).toBe(400);
      expect(listEntryVersions).not.toHaveBeenCalled();
    },
  );

  it('returns 401 without a user', async () => {
    jest.mocked(getCurrentUser).mockResolvedValue(null);

    const { statusCode } = await call('2026-07-09');

    expect(statusCode).toBe(401);
  });
});
