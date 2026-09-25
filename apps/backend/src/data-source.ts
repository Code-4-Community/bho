import { DataSource } from 'typeorm';
import { PluralNamingStrategy } from './strategies/plural-naming.strategy';
import * as dotenv from 'dotenv';
import { User } from './users/user.entity';
import { Import } from './imports/import.entity';
import { DailyObservation } from './observations/daily-observation.entity';
import { HourlyObservation } from './observations/hourly-observation.entity';
import { ScheduledObservation } from './observations/scheduled-observation.entity';
import { DailyRecord } from './records/daily-record.entity';
import { AuditLog } from './audit/audit-log.entity';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.NX_DB_HOST,
  port: parseInt(process.env.NX_DB_PORT as string, 10),
  username: process.env.NX_DB_USERNAME,
  password: process.env.NX_DB_PASSWORD,
  database: process.env.NX_DB_DATABASE,
  entities: [
    User,
    Import,
    DailyObservation,
    HourlyObservation,
    ScheduledObservation,
    DailyRecord,
    AuditLog,
  ],
  migrations: ['apps/backend/src/migrations/*.js'],
  // Setting synchronize: true shouldn't be used in production - otherwise you can lose production data
  synchronize: false,
  namingStrategy: new PluralNamingStrategy(),
});

export default AppDataSource;
