import type { HourlyObservation } from '@bho/weather-parsing';
import type { Row } from './cells';
import { HOURLY, TIME_COLUMN } from './layout';
import type { Day } from './sheet';

// Hourly rows, "00-01" to "23-24".
const HOUR = /^(\d{2})-(\d{2})$/;

function parseHourly(date: string, hour: number, row: Row): HourlyObservation {
  return {
    date,
    hour,
    tempF: row.int(...HOURLY.tempF),
    ...row.precip(...HOURLY.precip),
    windDir: row.dir(...HOURLY.windDir),
    windSpeedMph: row.int(...HOURLY.windSpeedMph, 0),
    sunshineMin: row.int(...HOURLY.sunshineMin, 0, 60),
    skyCover: row.int(...HOURLY.skyCover, 0, 8),
    visibilityMi: row.fraction(...HOURLY.visibilityMi),
    presentWeather: row.str(HOURLY.presentWeather[0]),
    humidityPct: row.int(...HOURLY.humidityPct, 0, 100),
    mountainVis: row.str(HOURLY.mountainVis[0]),
    remarks: row.str(HOURLY.remarks[0]),
  };
}

export function parseHours(day: Day, date: string): HourlyObservation[] {
  const [timeColumn, timeHeader] = TIME_COLUMN;
  const indexes = day.rows((cells) => HOUR.test(cells[timeColumn]));
  const labelOf = (index: number) => day.row(index).cells[timeColumn];
  const hourOf = (index: number) => Number(labelOf(index).slice(0, 2));

  const valid = indexes.filter((index) => {
    const [, from, to] = labelOf(index).match(HOUR)!;
    if (Number(from) <= 23 && Number(to) === Number(from) + 1) return true;
    day.fail(
      index,
      timeHeader,
      `Expected an hour like "05-06", got "${from}-${to}"`,
    );
    return false;
  });

  return day
    .unique(valid, timeHeader, labelOf)
    .map((index) => parseHourly(date, hourOf(index), day.row(index)));
}
