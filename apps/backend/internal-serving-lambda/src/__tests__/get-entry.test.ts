import type { APIGatewayProxyEvent } from 'aws-lambda';
import { getEntry } from '@bho/db-client';
import { getCurrentUser } from '../auth';
import { getEntryHandler } from '../routes/get-entry';

jest.mock('../auth');
jest.mock('@bho/db-client', () => ({ getEntry: jest.fn() }));

const ENTRY = {
  summary: { stationId: 1, date: '2026-07-09', maxTempF: 80, importId: 5 },
  hourly: [{ stationId: 1, date: '2026-07-09', hour: 1, tempF: 70 }],
  scheduled: [{ stationId: 1, date: '2026-07-09', obsTime: '09:00' }],
  currentImport: {
    importId: 5,
    fileName: 'July 2026.csv',
    importStatus: 'succeeded',
    uploadedAt: new Date('2026-07-09T12:00:00Z'),
    uploadedById: 1,
    uploadedByFirstName: 'Ada',
    uploadedByLastName: 'Lovelace',
  },
};

const call = async (date: string) => {
  const event = {
    httpMethod: 'GET',
    resource: '/entries/{date}',
    path: `/entries/${date}`,
    headers: {},
    pathParameters: { date },
    queryStringParameters: null,
    body: null,
  } as unknown as APIGatewayProxyEvent;
  const result = await getEntryHandler(event);
  return { statusCode: result.statusCode, body: JSON.parse(result.body) };
};

describe('getEntryHandler', () => {
  beforeEach(() => {
    jest.mocked(getCurrentUser).mockResolvedValue({ id: 'user-123' });
    jest
      .mocked(getEntry)
      .mockImplementation(async (date) =>
        date === '2026-07-09' ? (ENTRY as never) : undefined,
      );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns the summary, hourly, scheduled and current import', async () => {
    const { statusCode, body } = await call('2026-07-09');

    expect(statusCode).toBe(200);
    expect(getEntry).toHaveBeenCalledWith('2026-07-09');
    expect(body).toEqual({
      date: '2026-07-09',
      summary: ENTRY.summary,
      hourly: ENTRY.hourly,
      scheduled: ENTRY.scheduled,
      currentImport: {
        id: 5,
        fileName: 'July 2026.csv',
        status: 'succeeded',
        uploadedAt: '2026-07-09T12:00:00.000Z',
        uploadedBy: { id: 1, name: 'Ada Lovelace' },
      },
    });
  });

  it('returns 404 for a date with no entry', async () => {
    const { statusCode, body } = await call('2026-07-08');

    expect(statusCode).toBe(404);
    expect(body).toEqual({ message: 'Entry not found' });
  });

  it.each(['abc', '2026-7-9', '2026-02-30', '2026-13-01'])(
    'returns 400 for the invalid date %s',
    async (date) => {
      const { statusCode } = await call(date);

      expect(statusCode).toBe(400);
      expect(getEntry).not.toHaveBeenCalled();
    },
  );

  it('returns 401 without a user', async () => {
    jest.mocked(getCurrentUser).mockResolvedValue(null);

    const { statusCode } = await call('2026-07-09');

    expect(statusCode).toBe(401);
  });
});
