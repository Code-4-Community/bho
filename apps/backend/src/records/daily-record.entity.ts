import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';

import { Import } from '../imports/import.entity';
import { RecordElement } from './types';

// All-time record per calendar day, one row per element so a "record broken"
// check is a single lookup. Joins to observations on month and day, not a FK.
@Entity('daily_records')
export class DailyRecord {
  @PrimaryColumn({ type: 'smallint' })
  month: number;

  @PrimaryColumn({ type: 'smallint' })
  day: number;

  @PrimaryColumn({ type: 'enum', enum: RecordElement })
  element: RecordElement;

  // Null when the sheet says "None".
  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  value: string;

  // Ties list every year the record was set.
  @Column({ type: 'smallint', array: true })
  years: number[];

  @Column({ type: 'varchar', length: 3, nullable: true })
  windDir: string;

  @Column({ default: false })
  isEstimated: boolean;

  @ManyToOne(() => Import, { nullable: true })
  import: Import;
}
