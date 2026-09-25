import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';

import { Import } from '../imports/import.entity';

// Numeric columns come back from pg as strings to avoid float rounding.
@Entity('daily_observations')
export class DailyObservation {
  @PrimaryColumn({ type: 'date' })
  date: string;

  @Column({ type: 'smallint', nullable: true })
  maxTempF: number;

  @Column({ type: 'smallint', nullable: true })
  minTempF: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  precipIn: string;

  // The sheet writes "T" for a trace; precipIn is 0 on those days.
  @Column({ default: false })
  precipTrace: boolean;

  @Column({ type: 'numeric', precision: 4, scale: 1, nullable: true })
  snowfallIn: string;

  @Column({ type: 'numeric', precision: 4, scale: 1, nullable: true })
  snowDepthIn: string;

  @Column({ type: 'smallint', nullable: true })
  sunshineMin: number;

  @Column({ type: 'smallint', nullable: true })
  sunshinePct: number;

  @Column({ type: 'smallint', nullable: true })
  fastestMileMph: number;

  @Column({ type: 'varchar', length: 3, nullable: true })
  fastestMileDir: string;

  // All times are Eastern Standard Time year-round, as in the sheet.
  @Column({ type: 'time', nullable: true })
  fastestMileTime: string;

  // Knots, as recorded in the sheet.
  @Column({ type: 'smallint', nullable: true })
  peakGustKts: number;

  @Column({ type: 'varchar', length: 3, nullable: true })
  peakGustDir: string;

  @Column({ type: 'time', nullable: true })
  peakGustTime: string;

  @Column({ type: 'numeric', precision: 5, scale: 1, nullable: true })
  avgStationPressureMb: string;

  @Column({ type: 'time', nullable: true })
  sunrise: string;

  @Column({ type: 'time', nullable: true })
  sunset: string;

  @Column({ type: 'text', nullable: true })
  observerInitials: string;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @ManyToOne(() => Import, { nullable: true })
  import: Import;
}
