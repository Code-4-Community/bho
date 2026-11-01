import type { ScheduledObservation } from '@bho/weather-parsing';
import { toTime } from './cells';
import {
  AVERAGE_ROW_MARKER,
  PRESSURE_FIRST_TIME_COLUMN,
  ROW_LABELS,
  SCHEDULED,
  TIME_COLUMN,
} from './layout';
import type { Day } from './sheet';

// The "Station Pressure Computations" block: a header row of times ("0700",
// "1900", "AVG", sometimes "1200E") over rows of values. Returns each time's
// column plus the value rows.
function parsePressureBlock(day: Day) {
  const start = day.require(
    ROW_LABELS.pressureBlock,
    (cells) => cells[0] === ROW_LABELS.pressureBlock,
  );
  const header = start >= 0 ? day.row(start + 1).cells : [];

  const columns = new Map<string, number>();
  header.forEach((cell, i) => {
    const t = i >= PRESSURE_FIRST_TIME_COLUMN ? toTime(cell) : null;
    if (t) columns.set(t, i);
  });

  return {
    columns,
    attachedTherm: day.labelled(ROW_LABELS.attachedTherm),
    observedBarometer: day.labelled(ROW_LABELS.observedBarometer),
    totalCorrection: day.labelled(ROW_LABELS.totalCorrection),
  };
}

export function parseScheduled(day: Day, date: string): ScheduledObservation[] {
  const pressure = parsePressureBlock(day);

  const fromPressureBlock = (obsTime: string) => {
    const col = pressure.columns.get(obsTime);
    if (col === undefined) {
      return {
        attachedThermC: null,
        observedBarometerMb: null,
        pressureCorrectionMb: null,
      };
    }
    return {
      attachedThermC: pressure.attachedTherm.dec(col, ROW_LABELS.attachedTherm),
      observedBarometerMb: pressure.observedBarometer.dec(
        col,
        ROW_LABELS.observedBarometer,
      ),
      pressureCorrectionMb: pressure.totalCorrection.dec(
        col,
        ROW_LABELS.totalCorrection,
      ),
    };
  };

  // Scheduled rows start with an "HHMM" time.
  const [timeColumn, timeHeader] = TIME_COLUMN;
  const labelOf = (index: number) => day.row(index).cells[timeColumn];
  const valid = day
    .rows((cells) => /^\d{4}$/.test(cells[timeColumn]))
    .filter((index) => {
      const cell = labelOf(index);
      if (toTime(cell) !== null) return true;
      day.fail(index, timeHeader, `Not a time of day: "${cell}"`);
      return false;
    });

  const rows: ScheduledObservation[] = day
    .unique(valid, timeHeader, labelOf)
    .map((index) => {
      const row = day.row(index);
      const obsTime = toTime(row.cells[timeColumn])!;
      // The "Average ->" row has that label under snowfall, and the 0700/1900
      // average, not a reading, under vapor pressure.
      const isAverageRow = row.cells.includes(AVERAGE_ROW_MARKER);
      return {
        date,
        obsTime,
        stationPressureIn: row.dec(...SCHEDULED.stationPressureIn),
        ...fromPressureBlock(obsTime),
        dryBulbF: row.dec(...SCHEDULED.dryBulbF),
        wetBulbF: row.dec(...SCHEDULED.wetBulbF),
        dewpointF: row.int(...SCHEDULED.dewpointF),
        humidityPct: row.pct(...SCHEDULED.humidityPct),
        maxTempF: row.int(...SCHEDULED.maxTempF),
        minTempF: row.int(...SCHEDULED.minTempF),
        ...row.precip(...SCHEDULED.precip),
        snowfallIn: isAverageRow ? null : row.dec(...SCHEDULED.snowfallIn),
        snowDepthIn: row.dec(...SCHEDULED.snowDepthIn),
        vaporPressureMb: isAverageRow
          ? null
          : row.dec(...SCHEDULED.vaporPressureMb),
      };
    });

  // Extra readings (e.g. 1200) appear only in the pressure block.
  for (const obsTime of pressure.columns.keys()) {
    if (rows.some((r) => r.obsTime === obsTime)) continue;
    rows.push({
      date,
      obsTime,
      stationPressureIn: null,
      ...fromPressureBlock(obsTime),
      dryBulbF: null,
      wetBulbF: null,
      dewpointF: null,
      humidityPct: null,
      maxTempF: null,
      minTempF: null,
      precipIn: null,
      precipTrace: false,
      snowfallIn: null,
      snowDepthIn: null,
      vaporPressureMb: null,
    });
  }

  return rows.sort((a, b) => a.obsTime.localeCompare(b.obsTime));
}
