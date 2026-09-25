import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { DailyObservation } from './daily-observation.entity';

@Entity('hourly_observations')
export class HourlyObservation {
  @PrimaryColumn({ type: 'date' })
  date: string;

  // Start of the hour: the sheet's "00-01" row is hour 0.
  @PrimaryColumn({ type: 'smallint' })
  hour: number;

  @ManyToOne(() => DailyObservation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'date' })
  day: DailyObservation;

  @Column({ type: 'smallint', nullable: true })
  tempF: number;

  @Column({ type: 'numeric', precision: 4, scale: 2, nullable: true })
  precipIn: string;

  @Column({ default: false })
  precipTrace: boolean;

  @Column({ type: 'varchar', length: 3, nullable: true })
  windDir: string;

  @Column({ type: 'smallint', nullable: true })
  windSpeedMph: number;

  @Column({ type: 'smallint', nullable: true })
  sunshineMin: number;

  // Eighths of sky covered; only filled at observation hours.
  @Column({ type: 'smallint', nullable: true })
  skyCover: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  visibilityMi: string;

  @Column({ type: 'text', nullable: true })
  presentWeather: string;

  @Column({ type: 'smallint', nullable: true })
  humidityPct: number;

  @Column({ type: 'text', nullable: true })
  mountainVis: string;

  @Column({ type: 'text', nullable: true })
  remarks: string;
}
