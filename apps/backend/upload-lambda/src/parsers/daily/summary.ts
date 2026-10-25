import type { DailyObservation } from '@bho/weather-parsing';
import { NOTES_COLUMN, OTHER, ROW_LABELS, SUMMARY } from './layout';
import type { Day } from './sheet';

export function parseSummary(day: Day, date: string): DailyObservation {
  // Summary values are on the row after the "24HR Max" header.
  const summaryHeader = day.require(
    ROW_LABELS.summaryHeader,
    (c) => c[0] === ROW_LABELS.summaryHeader,
  );
  const s = day.row(summaryHeader === -1 ? -1 : summaryHeader + 1);

  // Possible sunshine, sunrise and sunset are under the hourly table.
  const aver = day.labelled(ROW_LABELS.hourlyAverage);
  const misc = day.labelled(ROW_LABELS.hourlyMisc);

  // Footnotes are in column G, between "Additional Notes:" and "INITIALS:".
  const initialsIndex = day.require(ROW_LABELS.initials, (c) =>
    c.includes(ROW_LABELS.initials),
  );
  const notesStart = day.find(
    (c) => c[NOTES_COLUMN] === ROW_LABELS.additionalNotes,
  );
  const notes: string[] = [];
  if (notesStart !== -1) {
    for (let i = notesStart + 1; i < initialsIndex; i++) {
      const note = day.row(i).str(NOTES_COLUMN);
      if (note) notes.push(note);
    }
  }
  const initials = day.row(initialsIndex);

  return {
    date,
    maxTempF: s.int(...SUMMARY.maxTempF),
    minTempF: s.int(...SUMMARY.minTempF),
    avgTempF: day
      .labelled(ROW_LABELS.averageTemperature)
      .dec(...OTHER.averageTemperature),
    normalTempF: day
      .labelled(ROW_LABELS.normalTemperature)
      .int(...OTHER.normalTemperature),
    ...s.precip(...SUMMARY.precip),
    snowfallIn: s.dec(...SUMMARY.snowfallIn),
    snowDepthIn: s.dec(...SUMMARY.snowDepthIn),
    sunshineMin: s.int(...SUMMARY.sunshineMin, 0),
    // "Poss 914" -> 914.
    sunshinePossibleMin: aver.read(
      OTHER.sunshinePossibleMin[0],
      OTHER.sunshinePossibleMin[1],
      'a value like "Poss 914"',
      (v) => {
        const match = v.match(/^Poss\s*(\d+)$/i);
        return match ? Number(match[1]) : null;
      },
    ),
    sunshinePct: s.pct(...SUMMARY.sunshinePct),
    fastestMileMph: s.int(...SUMMARY.fastestMileMph, 0),
    fastestMileDir: s.dir(...SUMMARY.fastestMileDir),
    fastestMileTime: s.time(...SUMMARY.fastestMileTime),
    ...s.peakGust(...SUMMARY.peakGust),
    avgStationPressureMb: day
      .labelled(ROW_LABELS.stationPressure)
      .dec(...OTHER.avgStationPressureMb),
    sunrise: aver.time(...OTHER.sunrise),
    sunset: misc.time(...OTHER.sunset),
    observerInitials: initials.str(
      initials.cells.indexOf(ROW_LABELS.initials) + 1,
    ),
    remarks: notes.length > 0 ? notes.join('\n') : null,
  };
}
