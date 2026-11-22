import type { APIGatewayProxyEvent } from 'aws-lambda';
import {
  fetchWeatherlinkData,
  normalizeWeatherlinkData,
} from '@bho/davis-client';
import { liveConditionsHandler } from '../routes/live-conditions';

jest.mock('@bho/davis-client');

const RAW_DATA = { currConditionValues: [], fetchedAt: 1763215212000 };

const NORMALIZED = {
  rainRateInHr: 0,
  windMph: 4,
  windDir: 'NNE',
  gustMph: 9,
  solarRadWm2: 312,
  tempF: 68.2,
  tempC: 20.1,
  humidityPct: 55,
  dewPointF: 51.3,
  windChillF: 68.2,
  pressure: 30.01,
  observedAt: 1763215200000,
  fetchedAt: 1763215212000,
};

const buildEvent = (): APIGatewayProxyEvent =>
  ({
    httpMethod: 'GET',
    resource: '/live-conditions',
    path: '/live-conditions',
    headers: {},
    pathParameters: null,
    queryStringParameters: null,
    body: null,
  } as unknown as APIGatewayProxyEvent);

const call = async () => {
  const result = await liveConditionsHandler(buildEvent());
  return {
    statusCode: result.statusCode,
    headers: result.headers,
    body: JSON.parse(result.body),
  };
};

describe('liveConditionsHandler', () => {
  beforeEach(() => {
    jest.mocked(fetchWeatherlinkData).mockResolvedValue(RAW_DATA);
    jest.mocked(normalizeWeatherlinkData).mockReturnValue(NORMALIZED);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  it('returns the normalized live conditions as JSON', async () => {
    const { statusCode, headers, body } = await call();

    expect(statusCode).toBe(200);
    expect(headers).toEqual({ 'Content-Type': 'application/json' });
    expect(body).toEqual(NORMALIZED);
  });

  it('normalizes the data it fetched', async () => {
    await call();

    expect(fetchWeatherlinkData).toHaveBeenCalledTimes(1);
    expect(normalizeWeatherlinkData).toHaveBeenCalledWith(RAW_DATA);
  });

  it('returns 502 when the WeatherLink request fails', async () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    jest
      .mocked(fetchWeatherlinkData)
      .mockRejectedValue(
        new Error('WeatherLink request failed: 503 Service Unavailable'),
      );

    const { statusCode, body } = await call();

    expect(statusCode).toBe(502);
    expect(body).toEqual({ message: 'Unable to fetch live conditions' });
    expect(normalizeWeatherlinkData).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();
  });

  it('returns 502 when the data cannot be normalized', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.mocked(normalizeWeatherlinkData).mockImplementation(() => {
      throw new Error(
        'Invalid WeatherLink data: currConditionValues is not an array',
      );
    });

    const { statusCode, body } = await call();

    expect(statusCode).toBe(502);
    expect(body).toEqual({ message: 'Unable to fetch live conditions' });
  });
});
