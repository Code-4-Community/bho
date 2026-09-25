import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1790372888092 implements MigrationInterface {
  name = 'InitSchema1790372888092';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "users" ("id" integer NOT NULL, "status" character varying NOT NULL, "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "email" character varying NOT NULL, CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."imports_status_enum" AS ENUM('succeeded', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "imports" ("id" SERIAL NOT NULL, "fileName" text NOT NULL, "uploadedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "status" "public"."imports_status_enum" NOT NULL, "errors" jsonb, "uploadedBy" integer NOT NULL, CONSTRAINT "PK_ea10c62f5eb1d75e83d8b5225db" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "daily_observations" ("date" date NOT NULL, "maxTempF" smallint, "minTempF" smallint, "precipIn" numeric(5,2), "precipTrace" boolean NOT NULL DEFAULT false, "snowfallIn" numeric(4,1), "snowDepthIn" numeric(4,1), "sunshineMin" smallint, "sunshinePct" smallint, "fastestMileMph" smallint, "fastestMileDir" character varying(3), "fastestMileTime" TIME, "peakGustKts" smallint, "peakGustDir" character varying(3), "peakGustTime" TIME, "avgStationPressureMb" numeric(5,1), "sunrise" TIME, "sunset" TIME, "observerInitials" text, "remarks" text, "import" integer, CONSTRAINT "PK_a7cec69d330c77094266383c7f7" PRIMARY KEY ("date"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "hourly_observations" ("date" date NOT NULL, "hour" smallint NOT NULL, "tempF" smallint, "precipIn" numeric(4,2), "precipTrace" boolean NOT NULL DEFAULT false, "windDir" character varying(3), "windSpeedMph" smallint, "sunshineMin" smallint, "skyCover" smallint, "visibilityMi" numeric(5,2), "presentWeather" text, "humidityPct" smallint, "mountainVis" text, "remarks" text, CONSTRAINT "PK_91c9c1470c1f91dd1e3dc45de22" PRIMARY KEY ("date", "hour"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "scheduled_observations" ("date" date NOT NULL, "obsTime" TIME NOT NULL, "stationPressureIn" numeric(5,3), "dryBulbF" numeric(4,1), "wetBulbF" numeric(4,1), "dewpointF" smallint, "humidityPct" smallint, "maxTempF" smallint, "minTempF" smallint, "precipIn" numeric(4,2), "precipTrace" boolean NOT NULL DEFAULT false, "snowfallIn" numeric(4,1), "snowDepthIn" numeric(4,1), "vaporPressureMb" numeric(4,1), CONSTRAINT "PK_ab5b2148436c377435699de1c4c" PRIMARY KEY ("date", "obsTime"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."daily_records_element_enum" AS ENUM('high', 'low', 'precip', 'snow', 'peak_gust')`,
    );
    await queryRunner.query(
      `CREATE TABLE "daily_records" ("month" smallint NOT NULL, "day" smallint NOT NULL, "element" "public"."daily_records_element_enum" NOT NULL, "value" numeric(5,2), "years" smallint array NOT NULL, "windDir" character varying(3), "isEstimated" boolean NOT NULL DEFAULT false, "import" integer, CONSTRAINT "PK_54cdb09a0715ffeddbb2193b0ac" PRIMARY KEY ("month", "day", "element"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "audit_log" ("id" SERIAL NOT NULL, "tableName" text NOT NULL, "rowKey" jsonb NOT NULL, "columnName" text NOT NULL, "oldValue" text, "newValue" text, "changedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "changedBy" integer NOT NULL, CONSTRAINT "PK_07fefa57f7f5ab8fc3f52b3ed0b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "imports" ADD CONSTRAINT "FK_c80e47438b6c9719cab60d65860" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_observations" ADD CONSTRAINT "FK_dcd7b8d6de045fa97944a212f0c" FOREIGN KEY ("import") REFERENCES "imports"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "hourly_observations" ADD CONSTRAINT "FK_04b56339d6c0b00fdf7f1c561c3" FOREIGN KEY ("date") REFERENCES "daily_observations"("date") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "scheduled_observations" ADD CONSTRAINT "FK_7576980c1c64dbea8fff5ad53e0" FOREIGN KEY ("date") REFERENCES "daily_observations"("date") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_records" ADD CONSTRAINT "FK_63812be4d466feba48443349a18" FOREIGN KEY ("import") REFERENCES "imports"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_log" ADD CONSTRAINT "FK_3c20bc116a9a51bab8206ddca1e" FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "audit_log" DROP CONSTRAINT "FK_3c20bc116a9a51bab8206ddca1e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_records" DROP CONSTRAINT "FK_63812be4d466feba48443349a18"`,
    );
    await queryRunner.query(
      `ALTER TABLE "scheduled_observations" DROP CONSTRAINT "FK_7576980c1c64dbea8fff5ad53e0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hourly_observations" DROP CONSTRAINT "FK_04b56339d6c0b00fdf7f1c561c3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_observations" DROP CONSTRAINT "FK_dcd7b8d6de045fa97944a212f0c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "imports" DROP CONSTRAINT "FK_c80e47438b6c9719cab60d65860"`,
    );
    await queryRunner.query(`DROP TABLE "audit_log"`);
    await queryRunner.query(`DROP TABLE "daily_records"`);
    await queryRunner.query(`DROP TYPE "public"."daily_records_element_enum"`);
    await queryRunner.query(`DROP TABLE "scheduled_observations"`);
    await queryRunner.query(`DROP TABLE "hourly_observations"`);
    await queryRunner.query(`DROP TABLE "daily_observations"`);
    await queryRunner.query(`DROP TABLE "imports"`);
    await queryRunner.query(`DROP TYPE "public"."imports_status_enum"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
