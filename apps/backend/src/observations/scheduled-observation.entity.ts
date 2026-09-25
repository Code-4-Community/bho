import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { DailyObservation } from './daily-observation.entity';

// Readings taken by hand at 0700, 0800, 1000, 1300 and 1900.
@Entity('scheduled_observations')
export class ScheduledObservation {
  @PrimaryColumn({ type: 'date' })
  date: string;

  @PrimaryColumn({ type: 'time' })
  obsTime: string;

  @ManyToOne(() => DailyObservation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'date' })
  day: DailyObservation;

  @Column({ type: 'numeric', precision: 5, scale: 3, nullable: true })
  stationPressureIn: string;

  @Column({ type: 'numeric', precision: 4, scale: 1, nullable: true })
  dryBulbF: string;

  @Column({ type: 'numeric', precision: 4, scale: 1, nullable: true })
  wetBulbF: string;

  @Column({ type: 'smallint', nullable: true })
  dewpointF: number;

  @Column({ type: 'smallint', nullable: true })
  humidityPct: number;

  // The max/min/precip/snow columns are only filled on the 0700 row and
  // cover the 24 hours ending at 0700.
  @Column({ type: 'smallint', nullable: true })
  maxTempF: number;

  @Column({ type: 'smallint', nullable: true })
  minTempF: number;

  @Column({ type: 'numeric', precision: 4, scale: 2, nullable: true })
  precipIn: string;

  @Column({ default: false })
  precipTrace: boolean;

  @Column({ type: 'numeric', precision: 4, scale: 1, nullable: true })
  snowfallIn: string;

  @Column({ type: 'numeric', precision: 4, scale: 1, nullable: true })
  snowDepthIn: string;

  @Column({ type: 'numeric', precision: 4, scale: 1, nullable: true })
  vaporPressureMb: string;
}
