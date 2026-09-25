import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from '../users/user.entity';

@Entity('audit_log')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  tableName: string;

  // Primary key of the edited row, e.g. { "date": "2026-07-01", "hour": 0 }.
  @Column({ type: 'jsonb' })
  rowKey: Record<string, unknown>;

  @Column({ type: 'text' })
  columnName: string;

  @Column({ type: 'text', nullable: true })
  oldValue: string;

  @Column({ type: 'text', nullable: true })
  newValue: string;

  @ManyToOne(() => User, { nullable: false })
  changedBy: User;

  @CreateDateColumn({ type: 'timestamptz' })
  changedAt: Date;
}
