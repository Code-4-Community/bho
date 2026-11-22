import { fetchWeatherlinkData } from './fetch-weatherlink-data';

const DEFAULT_URL =
  'https://www.weatherlink.com/embeddablePage/summaryData/58237ce672554bc5b0009b67644756f3';

const NOW = new Date('2026-11-16T12:00:00Z');

const RAW_DATA = {
  lastReceived: 1763294400000,
  currConditionValues: [{ sensorDataName: 'Temp', value: 68.2 }],
};

const jsonResponse = (body: unknown, status = 200, statusText = 'OK') =>
  new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { 'Content-Type': 'application/json' },
  });

describe('fetchWeatherlinkData', () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(jsonResponse(RAW_DATA));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('returns the response JSON with fetchedAt added', async () => {
    const data = await fetchWeatherlinkData();

    expect(data).toEqual({ ...RAW_DATA, fetchedAt: NOW.getTime() });
  });

  it('fetches the station URL by default', async () => {
    await fetchWeatherlinkData();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(DEFAULT_URL);
  });

  it('fetches a custom URL when one is passed', async () => {
    await fetchWeatherlinkData('https://example.com/summary');

    expect(fetchMock.mock.calls[0][0]).toBe('https://example.com/summary');
  });

  it('passes an abort signal so the request can time out', async () => {
    await fetchWeatherlinkData();

    const options = fetchMock.mock.calls[0][1];
    expect(options?.signal).toBeInstanceOf(AbortSignal);
  });

  it('throws with the status when the response is not OK', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: 'down' }, 503, 'Service Unavailable'),
    );

    await expect(fetchWeatherlinkData()).rejects.toThrow(
      'WeatherLink request failed: 503 Service Unavailable',
    );
  });

  it('passes network errors through', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    await expect(fetchWeatherlinkData()).rejects.toThrow('fetch failed');
  });
});
