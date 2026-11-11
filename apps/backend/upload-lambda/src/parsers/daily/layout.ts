// Where everything is on the daily sheet. This file is the only place that
// knows sheet positions; the parsers read their columns and labels from here.
// README.md in this folder shows the sheet with each region labelled.
//
// A cell is [column, header]. Columns are 0-based (A = 0). The header is the
// label printed on the sheet; it is what error messages show staff.
export type Cell = readonly [column: number, header: string];

// Rows are found by their text, never by number, so a day block can start on
// any row. A block runs from its "DATE:" row to the next one.
export const DATE_LABEL = 'DATE:';

export const ROW_LABELS = {
  // Under the hourly table.
  hourlyAverage: 'Aver.',
  hourlyMisc: 'Misc.',
  // The summary's header row. Its values are on the row below.
  summaryHeader: '24HR Max',
  // Left of the summary, column A.
  averageTemperature: 'Average Temperature',
  normalTemperature: 'Normal Temperature',
  stationPressure: 'Station Pressure',
  // The pressure block, column A. The row above its times is the header.
  pressureBlock: 'Station Pressure Computations',
  attachedTherm: 'Attached Therm.',
  observedBarometer: 'Observed Barometer',
  totalCorrection: 'Total Correction',
  // Bottom of the block.
  initials: 'INITIALS:',
  // Column G, starts the footnotes.
  additionalNotes: 'Additional Notes:',
} as const;

// "Time (EST)" in column A holds the row's key: "05-06" for hourly rows.
export const TIME_COLUMN: Cell = [0, 'Time (EST)'];

// Hourly table: one row per hour, "00-01" to "23-24".
export const HOURLY = {
  tempF: [1, 'Temp (°F)'],
  precip: [2, 'Precip (inches)'],
  windDir: [3, 'Wind Dir.'],
  windSpeedMph: [4, 'Wind Spd (mph)'],
  sunshineMin: [5, 'Sunshine (min)'],
  skyCover: [6, 'Sky Cover (0-8)'],
  visibilityMi: [7, 'Lwst VSBL (mls)'],
  presentWeather: [8, 'Prsnt WX'],
  humidityPct: [9, 'Rel. Hum.'],
  mountainVis: [10, 'Mnts VSBL'],
  remarks: [11, 'Notes'],
} as const satisfies Record<string, Cell>;

// Scheduled Observations: one row per reading, keyed by an "HHMM" time.
export const SCHEDULED = {
  stationPressureIn: [1, 'Station Pressure'],
  dryBulbF: [2, 'Dry Bulb'],
  wetBulbF: [3, 'Wet Bulb'],
  dewpointF: [4, 'Dewpoint'],
  humidityPct: [5, 'Relative Humidity'],
  maxTempF: [6, 'Max'],
  minTempF: [7, 'Min'],
  precip: [8, 'Precip'],
  snowfallIn: [9, 'Snow Fall'],
  snowDepthIn: [10, 'Snow Depth'],
  vaporPressureMb: [11, 'Vapor Pressure'],
} as const satisfies Record<string, Cell>;

// A scheduled row holding this text under snowfall is the average row: its
// snowfall and vapor pressure cells are not a reading.
export const AVERAGE_ROW_MARKER = 'Average ->';

// Station Pressure Computations: times run across the row above the values,
// starting at this column ("0700", "1900", "AVG", sometimes "1200E"). The
// values are read from the row labelled in ROW_LABELS, under each time.
export const PRESSURE_FIRST_TIME_COLUMN = 2;
export const PRESSURE_BLOCK = {
  attachedThermC: ROW_LABELS.attachedTherm,
  observedBarometerMb: ROW_LABELS.observedBarometer,
  pressureCorrectionMb: ROW_LABELS.totalCorrection,
} as const;

// Summary of Day: the row below "24HR Max".
export const SUMMARY = {
  maxTempF: [0, '24HR Max'],
  minTempF: [1, '24HR Min'],
  precip: [2, 'Water Equiv.'],
  snowfallIn: [4, 'Snowfall'],
  snowDepthIn: [5, 'Dpth 0700'],
  sunshineMin: [6, 'Total Min.'],
  sunshinePct: [7, '% poss.'],
  fastestMileMph: [8, 'Fast. Mile'],
  fastestMileDir: [9, 'Fast. Mile Dir'],
  fastestMileTime: [10, 'Time'],
  peakGust: [11, 'Peak Gust (KTS)'],
} as const satisfies Record<string, Cell>;

// Single cells outside the tables above.
export const OTHER = {
  // "Aver." row: "Poss 914".
  sunshinePossibleMin: [5, 'Poss'],
  // "Aver." row and "Misc." row: "0411E" and "1925E".
  sunrise: [10, 'SUNRISE'],
  sunset: [10, 'SUNSET'],
  // Right of "Average Temperature" and "Normal Temperature".
  averageTemperature: [3, 'Average Temperature'],
  normalTemperature: [3, 'Normal Temperature'],
  // "Station Pressure" row, under AVG.
  avgStationPressureMb: [4, 'AVG'],
} as const satisfies Record<string, Cell>;

// Footnotes sit in column G, between "Additional Notes:" and "INITIALS:".
export const NOTES_COLUMN = 6;
