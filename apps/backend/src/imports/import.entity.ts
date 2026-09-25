import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from '../users/user.entity';
import { ImportStatus } from './types';

@Entity()
export class Import {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  fileName: string;

  @ManyToOne(() => User, { nullable: false })
  uploadedBy: User;

  @CreateDateColumn({ type: 'timestamptz' })
  uploadedAt: Date;

  @Column({ type: 'enum', enum: ImportStatus })
  status: ImportStatus;

  // Rows that failed validation, with the reason for each.
  @Column({ type: 'jsonb', nullable: true })
  errors: unknown;
}
