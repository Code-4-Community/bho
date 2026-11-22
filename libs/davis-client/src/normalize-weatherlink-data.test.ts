import summaryData from './__fixtures__/summary-data.json';
import {
  degreesToCardinal,
  normalizeWeatherlinkData,
} from './normalize-weatherlink-data';

const FETCHED_AT = 1794806400000;

const RAW_DATA = {
  ...summaryData,
  fetchedAt: FETCHED_AT,
} as Record<string, unknown>;

const rawWith = (
  sensors: unknown[],
  extra: Record<string, unknown> = {},
): Record<string, unknown> => ({
  lastReceived: 1794806323000,
  fetchedAt: FETCHED_AT,
  currConditionValues: sensors,
  ...extra,
});

describe('degreesToCardinal', () => {
  it.each([
    [0, 'N'],
    [90, 'E'],
    [180, 'S'],
    [270, 'W'],
    [45, 'NE'],
    [304, 'NW'],
    [22.5, 'NNE'],
  ])('maps %d degrees to %s', (degrees, expected) => {
    expect(degreesToCardinal(degrees)).toBe(expected);
  });

  it('wraps 360 degrees back to N', () => {
    expect(degreesToCardinal(360)).toBe('N');
  });

  it('rounds values just below north up to N', () => {
    expect(degreesToCardinal(359)).toBe('N');
  });

  it('normalizes negative degrees', () => {
    expect(degreesToCardinal(-90)).toBe('W');
  });

  it('normalizes degrees above 360', () => {
    expect(degreesToCardinal(450)).toBe('E');
  });
});

describe('normalizeWeatherlinkData', () => {
  it('maps the fixture sensors to the normalized fields', () => {
    expect(normalizeWeatherlinkData(RAW_DATA)).toEqual({
      rainRateInHr: 0,
      windMph: 9,
      windDir: 'NW',
      gustMph: 13,
      solarRadWm2: 0,
      tempF: 33.9,
      tempC: 1.1,
      humidityPct: 85.6,
      dewPointF: 30,
      windChillF: 26.2,
      pressure: 30.12,
      observedAt: summaryData.lastReceived,
      fetchedAt: FETCHED_AT,
    });
  });

  it('converts the wind direction from degrees to a cardinal', () => {
    const result = normalizeWeatherlinkData(
      rawWith([{ sensorDataName: 'Wind Direction', value: 90 }]),
    );

    expect(result.windDir).toBe('E');
  });

  it('converts tempF to tempC rounded to one decimal', () => {
    const result = normalizeWeatherlinkData(
      rawWith([{ sensorDataName: 'Temp', value: 68.2 }]),
    );

    expect(result.tempF).toBe(68.2);
    expect(result.tempC).toBe(20.1);
  });

  it('handles freezing and sub-zero temperatures', () => {
    expect(
      normalizeWeatherlinkData(rawWith([{ sensorDataName: 'Temp', value: 32 }]))
        .tempC,
    ).toBe(0);
    expect(
      normalizeWeatherlinkData(rawWith([{ sensorDataName: 'Temp', value: -4 }]))
        .tempC,
    ).toBe(-20);
  });

  it('returns null for every sensor missing from the array', () => {
    const result = normalizeWeatherlinkData(rawWith([]));

    expect(result).toEqual({
      rainRateInHr: null,
      windMph: null,
      windDir: null,
      gustMph: null,
      solarRadWm2: null,
      tempF: null,
      tempC: null,
      humidityPct: null,
      dewPointF: null,
      windChillF: null,
      pressure: null,
      observedAt: 1794806323000,
      fetchedAt: FETCHED_AT,
    });
  });

  it('returns null for sensors whose value is not a finite number', () => {
    const result = normalizeWeatherlinkData(
      rawWith([
        { sensorDataName: 'Temp', value: '68.2' },
        { sensorDataName: 'Hum', value: null },
        { sensorDataName: 'Wind Speed', value: NaN },
        { sensorDataName: 'Dew Point', value: Infinity },
        { sensorDataName: 'Wind Direction', value: 'N' },
      ]),
    );

    expect(result.tempF).toBeNull();
    expect(result.tempC).toBeNull();
    expect(result.humidityPct).toBeNull();
    expect(result.windMph).toBeNull();
    expect(result.dewPointF).toBeNull();
    expect(result.windDir).toBeNull();
  });

  it('keeps zero values rather than treating them as missing', () => {
    const result = normalizeWeatherlinkData(
      rawWith([
        { sensorDataName: 'Rain Rate', value: 0 },
        { sensorDataName: 'Wind Direction', value: 0 },
      ]),
    );

    expect(result.rainRateInHr).toBe(0);
    expect(result.windDir).toBe('N');
  });

  it('ignores malformed sensor entries', () => {
    const result = normalizeWeatherlinkData(
      rawWith([
        null,
        'Temp',
        42,
        { value: 50 },
        { sensorDataName: 7, value: 50 },
        { sensorDataName: 'Hum', value: 60 },
      ]),
    );

    expect(result.humidityPct).toBe(60);
    expect(result.tempF).toBeNull();
  });

  it('ignores sensors that are not mapped to an output field', () => {
    const result = normalizeWeatherlinkData(
      rawWith([{ sensorDataName: 'Rain Storm', value: 1.5 }]),
    );

    expect(Object.values(result)).not.toContain(1.5);
  });

  it('uses the last value when a sensor appears more than once', () => {
    const result = normalizeWeatherlinkData(
      rawWith([
        { sensorDataName: 'Temp', value: 50 },
        { sensorDataName: 'Temp', value: 51 },
      ]),
    );

    expect(result.tempF).toBe(51);
  });

  it('returns null timestamps when they are missing or invalid', () => {
    const result = normalizeWeatherlinkData({
      currConditionValues: [],
      lastReceived: 'yesterday',
    });

    expect(result.observedAt).toBeNull();
    expect(result.fetchedAt).toBeNull();
  });

  it('throws when currConditionValues is missing', () => {
    expect(() => normalizeWeatherlinkData({})).toThrow(
      'Invalid WeatherLink data: currConditionValues is not an array',
    );
  });

  it('throws when currConditionValues is not an array', () => {
    expect(() =>
      normalizeWeatherlinkData({ currConditionValues: { Temp: 68 } }),
    ).toThrow('currConditionValues is not an array');
  });
});
