const CARDINALS = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSW',
  'SW',
  'WSW',
  'W',
  'WNW',
  'NW',
  'NNW',
];

// Output field -> `sensorDataName` in the Davis `currConditionValues` array.
const SENSOR_NAMES = {
  rainRateInHr: 'Rain Rate',
  windMph: 'Wind Speed',
  gustMph: '10 Min High Wind Speed',
  solarRadWm2: 'Solar Rad',
  tempF: 'Temp',
  humidityPct: 'Hum',
  dewPointF: 'Dew Point',
  windChillF: 'Wind Chill',
  pressure: 'Barometer',
} as const;

export function degreesToCardinal(degrees: number): string {
  const normalized = ((degrees % 360) + 360) % 360;
  return CARDINALS[Math.round(normalized / 22.5) % 16];
}

const toNumberOrNull = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

export function normalizeWeatherlinkData(
  raw: Record<string, unknown>,
): Record<string, number | string | null> {
  const sensors = raw.currConditionValues;
  if (!Array.isArray(sensors)) {
    throw new Error(
      'Invalid WeatherLink data: currConditionValues is not an array',
    );
  }

  const valuesByName = new Map<string, number | null>();
  for (const sensor of sensors) {
    if (sensor && typeof sensor === 'object') {
      const { sensorDataName, value } = sensor as Record<string, unknown>;
      if (typeof sensorDataName === 'string') {
        valuesByName.set(sensorDataName, toNumberOrNull(value));
      }
    }
  }
  const sensorValue = (name: string): number | null =>
    valuesByName.get(name) ?? null;

  const tempF = sensorValue(SENSOR_NAMES.tempF);
  const windDirDegrees = sensorValue('Wind Direction');

  return {
    rainRateInHr: sensorValue(SENSOR_NAMES.rainRateInHr),
    windMph: sensorValue(SENSOR_NAMES.windMph),
    windDir: windDirDegrees === null ? null : degreesToCardinal(windDirDegrees),
    gustMph: sensorValue(SENSOR_NAMES.gustMph),
    solarRadWm2: sensorValue(SENSOR_NAMES.solarRadWm2),
    tempF,
    tempC:
      tempF === null ? null : Math.round((((tempF - 32) * 5) / 9) * 10) / 10,
    humidityPct: sensorValue(SENSOR_NAMES.humidityPct),
    dewPointF: sensorValue(SENSOR_NAMES.dewPointF),
    windChillF: sensorValue(SENSOR_NAMES.windChillF),
    pressure: sensorValue(SENSOR_NAMES.pressure),
    observedAt: toNumberOrNull(raw.lastReceived),
    fetchedAt: toNumberOrNull(raw.fetchedAt),
  };
}
