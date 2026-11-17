import type { APIGatewayProxyEvent } from 'aws-lambda';
import { fetchWeatherlinkData } from '@bho/davis-client';
import { handler } from '../handler';
import {
  DEGRADED_MAX_AGE_MS,
  HEALTHY_MAX_AGE_MS,
  PROVIDERS,
  getPipelineStatus,
} from '../pipeline-status';

// Only the fetch is mocked; the real normalizeWeatherlinkData reads the response
jest.mock('@bho/davis-client', () => ({
  ...jest.requireActual('@bho/davis-client'),
  fetchWeatherlinkData: jest.fn(),
}));

const NOW = new Date('2026-11-16T12:00:00.000Z').getTime();
const MINUTE = 60 * 1000;
// The ticket asks for a 3 second timeout, so the tests use the number itself

// A WeatherLink summaryData response, as fetchWeatherlinkData returns it
const davisResponse = (lastReceived: unknown) => ({
  ownerName: 'ISS',
  lastReceived,
  currConditionValues: [{ sensorDataName: 'Temp', value: 50 }],
  fetchedAt: NOW,
});

const NOT_INTEGRATED = [
  { name: 'APRSWxNet', state: 'not_integrated', lastUpdatedAt: null },
  { name: 'Weather Underground', state: 'not_integrated', lastUpdatedAt: null },
];

const statusFor = async (lastReceived: unknown) => {
  jest
    .mocked(fetchWeatherlinkData)
    .mockResolvedValue(davisResponse(lastReceived));
  return getPipelineStatus();
};

describe('getPipelineStatus', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('reports a recent reading as healthy, with WeatherLink active', async () => {
    expect(await statusFor(NOW - 2 * MINUTE)).toEqual({
      active: 'WeatherLink',
      checkedAt: '2026-11-16T12:00:00.000Z',
      providers: [
        {
          name: 'WeatherLink',
          state: 'healthy',
          lastUpdatedAt: '2026-11-16T11:58:00.000Z',
        },
        ...NOT_INTEGRATED,
      ],
    });
  });

  it.each([
    ['0 minutes', 'healthy', 0],
    ['exactly 15 minutes', 'healthy', HEALTHY_MAX_AGE_MS],
    ['just over 15 minutes', 'degraded', HEALTHY_MAX_AGE_MS + 1],
    ['exactly 1 hour', 'degraded', DEGRADED_MAX_AGE_MS],
    ['just over 1 hour', 'down', DEGRADED_MAX_AGE_MS + 1],
    ['a day', 'down', 24 * 60 * MINUTE],
  ])('reports a reading %s old as %s', async (_age, state, ageMs) => {
    const { providers } = await statusFor(NOW - ageMs);

    expect(providers[0]).toEqual({
      name: 'WeatherLink',
      state,
      lastUpdatedAt: new Date(NOW - ageMs).toISOString(),
    });
  });

  it('reports a reading from the future (station clock ahead) as healthy', async () => {
    const { providers } = await statusFor(NOW + 5 * MINUTE);

    expect(providers[0].state).toBe('healthy');
  });

  it('keeps a degraded WeatherLink active', async () => {
    const { active } = await statusFor(NOW - 30 * MINUTE);

    expect(active).toBe('WeatherLink');
  });

  it('has no active source when WeatherLink is down', async () => {
    const { active } = await statusFor(NOW - 2 * DEGRADED_MAX_AGE_MS);

    expect(active).toBeNull();
  });

  it.each([
    ['missing', undefined],
    ['null', null],
    ['not a number', '2026-11-16T11:58:00Z'],
  ])(
    'reports degraded with no lastUpdatedAt when the timestamp is %s',
    async (_label, lastReceived) => {
      const { active, providers } = await statusFor(lastReceived);

      expect(providers[0]).toEqual({
        name: 'WeatherLink',
        state: 'degraded',
        lastUpdatedAt: null,
      });
      expect(active).toBe('WeatherLink');
    },
  );

  it('reports down with no lastUpdatedAt when the fetch fails', async () => {
    jest
      .mocked(fetchWeatherlinkData)
      .mockRejectedValue(
        new Error('WeatherLink request failed: 503 Service Unavailable'),
      );

    expect(await getPipelineStatus()).toEqual({
      active: null,
      checkedAt: '2026-11-16T12:00:00.000Z',
      providers: [
        { name: 'WeatherLink', state: 'down', lastUpdatedAt: null },
        ...NOT_INTEGRATED,
      ],
    });
    expect(console.error).toHaveBeenCalled();
  });

  it('reports down when the response has no sensor values', async () => {
    jest
      .mocked(fetchWeatherlinkData)
      .mockResolvedValue({ lastReceived: NOW, fetchedAt: NOW });

    const { providers } = await getPipelineStatus();

    expect(providers[0]).toEqual({
      name: 'WeatherLink',
      state: 'down',
      lastUpdatedAt: null,
    });
  });

  it('reports down once the fetch takes 3 seconds', async () => {
    jest
      .mocked(fetchWeatherlinkData)
      .mockReturnValue(new Promise(() => undefined)); // never settles
    let settled = false;
    const pending = getPipelineStatus().finally(() => (settled = true));

    await jest.advanceTimersByTimeAsync(2999);
    expect(settled).toBe(false);
    await jest.advanceTimersByTimeAsync(1);

    expect((await pending).providers[0]).toEqual({
      name: 'WeatherLink',
      state: 'down',
      lastUpdatedAt: null,
    });
  });

  it('waits for a fetch that finishes just under 3 seconds', async () => {
    jest
      .mocked(fetchWeatherlinkData)
      .mockReturnValue(
        new Promise((resolve) =>
          setTimeout(() => resolve(davisResponse(NOW - 2 * MINUTE)), 2999),
        ),
      );
    const pending = getPipelineStatus();

    await jest.advanceTimersByTimeAsync(3000);

    expect((await pending).providers[0].state).toBe('healthy');
  });

  it('makes the first source that is up active, in priority order', async () => {
    jest
      .mocked(fetchWeatherlinkData)
      .mockRejectedValue(new Error('connection refused'));
    const backup = {
      name: 'APRSWxNet',
      lastReadingAt: async () => NOW - MINUTE,
    };

    const { active, providers } = await getPipelineStatus([
      PROVIDERS[0],
      backup,
    ]);

    expect(active).toBe('APRSWxNet');
    expect(providers.map(({ state }) => state)).toEqual(['down', 'healthy']);
  });
});

describe('GET /pipeline-status through the lambda handler', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it('returns the pipeline status', async () => {
    jest.useFakeTimers({ now: NOW });
    jest
      .mocked(fetchWeatherlinkData)
      .mockResolvedValue(davisResponse(NOW - 2 * MINUTE));

    const result = await handler({
      httpMethod: 'GET',
      resource: '/pipeline-status',
      path: '/pipeline-status',
      headers: {},
      pathParameters: null,
      queryStringParameters: null,
      body: null,
    } as unknown as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toMatchObject({
      active: 'WeatherLink',
      providers: [{ name: 'WeatherLink', state: 'healthy' }, ...NOT_INTEGRATED],
    });
  });
});
