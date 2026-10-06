import type { ColumnType, Generated } from 'kysely';

// Table types for Kysely, matching db/migrations. pg returns numeric as a
// string so no precision is lost, and date/timestamptz as a Date.
type Numeric = ColumnType<string, number | string, number | string>;
type DateColumn = ColumnType<Date, Date | string, Date | string>;
type Json = ColumnType<unknown, string, string>;

export interface UsersTable {
  id: Generated<number>;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
}

export interface StationsTable {
  id: Generated<number>;
  code: string;
}

export interface ImportsTable {
  id: Generated<number>;
  kind: string;
  fileName: string;
  s3Key: string;
  fileHash: string;
  uploadedBy: number;
  uploadedAt: ColumnType<Date, Date | string | undefined, Date | string>;
  status: string;
  errors: Json | null;
}

export interface DailyObservationsTable {
  stationId: number;
  date: DateColumn;
  maxTempF: number | null;
  minTempF: number | null;
  avgTempF: Numeric | null;
  normalTempF: number | null;
  precipIn: Numeric | null;
  precipTrace: boolean;
  snowfallIn: Numeric | null;
  snowDepthIn: Numeric | null;
  sunshineMin: number | null;
  sunshinePossibleMin: number | null;
  sunshinePct: number | null;
  fastestMileMph: number | null;
  fastestMileDir: string | null;
  fastestMileTime: string | null;
  peakGustKts: number | null;
  peakGustDir: string | null;
  peakGustTime: string | null;
  avgStationPressureMb: Numeric | null;
  sunrise: string | null;
  sunset: string | null;
  observerInitials: string | null;
  remarks: string | null;
  importId: number;
}

export interface HourlyObservationsTable {
  stationId: number;
  date: DateColumn;
  hour: number;
  tempF: number | null;
  precipIn: Numeric | null;
  precipTrace: boolean;
  windDir: string | null;
  windSpeedMph: number | null;
  sunshineMin: number | null;
  skyCover: number | null;
  visibilityMi: Numeric | null;
  presentWeather: string | null;
  humidityPct: number | null;
  mountainVis: string | null;
  remarks: string | null;
}

export interface ScheduledObservationsTable {
  stationId: number;
  date: DateColumn;
  obsTime: string;
  stationPressureIn: Numeric | null;
  attachedThermC: Numeric | null;
  observedBarometerMb: Numeric | null;
  pressureCorrectionMb: Numeric | null;
  dryBulbF: Numeric | null;
  wetBulbF: Numeric | null;
  dewpointF: number | null;
  humidityPct: number | null;
  maxTempF: number | null;
  minTempF: number | null;
  precipIn: Numeric | null;
  precipTrace: boolean;
  snowfallIn: Numeric | null;
  snowDepthIn: Numeric | null;
  vaporPressureMb: Numeric | null;
}

export interface DailyRecordsTable {
  stationId: number;
  month: number;
  day: number;
  highF: number | null;
  highYears: number[] | null;
  lowF: number | null;
  lowYears: number[] | null;
  precipIn: Numeric | null;
  precipYears: number[] | null;
  snowIn: Numeric | null;
  snowYears: number[] | null;
  peakGustMph: number | null;
  peakGustDir: string | null;
  peakGustIsEstimated: boolean;
  peakGustYears: number[] | null;
  notes: string | null;
  importId: number;
}

// Written only by the audit_row() trigger.
export interface AuditLogTable {
  id: Generated<number>;
  tableName: string;
  rowKey: unknown;
  action: 'insert' | 'update' | 'delete';
  oldData: unknown;
  newData: unknown;
  changedBy: number | null;
  importId: number | null;
  changedAt: Generated<Date>;
}

export interface Database {
  users: UsersTable;
  stations: StationsTable;
  imports: ImportsTable;
  daily_observations: DailyObservationsTable;
  hourly_observations: HourlyObservationsTable;
  scheduled_observations: ScheduledObservationsTable;
  daily_records: DailyRecordsTable;
  audit_log: AuditLogTable;
}
