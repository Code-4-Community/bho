import { Kysely, sql } from 'kysely';

// Small dev dataset. July 1 2026 comes from the daily sample sheet; July 2-3
// are made up to cover nulls and a trace of precipitation. The records are
// from the (synthetic) historical test sheet. Safe to run more than once.
export async function seed(db: Kysely<any>): Promise<void> {
  await db.transaction().execute(async (trx) => {
    const station = await trx
      .selectFrom('stations')
      .select('id')
      .where('code', '=', '19737-02')
      .executeTakeFirstOrThrow();

    await trx
      .insertInto('users')
      .values({
        email: 'dev@example.com',
        firstName: 'Dev',
        lastName: 'User',
        status: 'ADMIN',
      })
      .onConflict((oc) => oc.column('email').doNothing())
      .execute();
    const user = await trx
      .selectFrom('users')
      .select('id')
      .where('email', '=', 'dev@example.com')
      .executeTakeFirstOrThrow();

    // imports has no natural key, so look up by file hash to stay idempotent.
    async function importFor(
      kind: string,
      fileName: string,
      fileHash: string,
    ): Promise<number> {
      const existing = await trx
        .selectFrom('imports')
        .select('id')
        .where('fileHash', '=', fileHash)
        .executeTakeFirst();
      if (existing) return existing.id;
      const row = await trx
        .insertInto('imports')
        .values({
          kind,
          fileName,
          s3Key: `uploads/${fileName}`,
          fileHash,
          uploadedBy: user.id,
          status: 'succeeded',
        })
        .returning('id')
        .executeTakeFirstOrThrow();
      return row.id;
    }
    const dailyImport = await importFor(
      'daily',
      'DAILY - 07. July2026.xlsx',
      'seed-hash-daily',
    );
    const recordsImport = await importFor(
      'historical',
      'BHO_WeatherRecords_Master_TestData.xlsx',
      'seed-hash-historical',
    );

    // The audit trigger reads these to fill changedBy / importId.
    const actAs = async (importId: number) => {
      await sql`select set_config('app.user_id', ${String(user.id)}, true),
                       set_config('app.import_id', ${String(
                         importId,
                       )}, true)`.execute(trx);
    };

    await actAs(dailyImport);
    const stationId = station.id;
    const base = { stationId, importId: dailyImport, precipTrace: false };

    await trx
      .insertInto('daily_observations')
      .values([
        {
          ...base,
          date: '2026-07-01',
          maxTempF: 95,
          minTempF: 68,
          avgTempF: 81.5,
          normalTempF: 71,
          precipIn: 0,
          snowfallIn: 0,
          snowDepthIn: 0,
          sunshineMin: 704,
          sunshinePossibleMin: 914,
          sunshinePct: 77,
          fastestMileMph: 17,
          fastestMileDir: 'SW',
          fastestMileTime: '02:45',
          peakGustKts: 20,
          peakGustDir: 'WSW',
          peakGustTime: '08:54',
          avgStationPressureMb: 991.4,
          sunrise: '04:11',
          sunset: '19:25',
          observerInitials: 'test',
          remarks: 'test',
        },
        {
          // Mostly empty: nobody recorded the day. Empty is null, never 0.
          ...base,
          date: '2026-07-02',
          maxTempF: 88,
          minTempF: 66,
          normalTempF: 71,
        },
        {
          // Trace of rain: precipIn stays null, precipTrace is true.
          ...base,
          date: '2026-07-03',
          maxTempF: 79,
          minTempF: 63,
          avgTempF: 71,
          normalTempF: 71,
          precipTrace: true,
          sunshineMin: 310,
          sunshinePossibleMin: 914,
          sunshinePct: 34,
          observerInitials: 'test',
          remarks: 'test',
        },
      ])
      .onConflict((oc) => oc.columns(['stationId', 'date']).doNothing())
      .execute();

    // July 1 hourly: [tempF, windDir, windSpeedMph, sunshineMin]
    const hourly: [number, string, number, number | null][] = [
      [68, 'SW', 13, null],
      [69, 'SW', 14, null],
      [70, 'SW', 14, null],
      [69, 'SW', 14, null],
      [69, 'SW', 13, 0],
      [70, 'SSW', 12, 36],
      [72, 'WSW', 11, 6],
      [74, 'WSW', 10, 12],
      [79, 'WSW', 13, 48],
      [84, 'W', 10, 60],
      [88, 'W', 9, 60],
      [89, 'WNW', 5, 60],
      [91, 'W', 4, 60],
      [93, 'W', 6, 54],
      [95, 'W', 4, 60],
      [92, 'WSW', 8, 60],
      [90, 'SSW', 9, 60],
      [87, 'SSW', 8, 60],
      [83, 'SSW', 8, 36],
      [81, 'SSW', 11, 0],
      [80, 'SW', 12, null],
      [79, 'SW', 11, null],
      [79, 'SW', 11, null],
      [78, 'WSW', 10, null],
    ];
    await trx
      .insertInto('hourly_observations')
      .values(
        hourly.map(([tempF, windDir, windSpeedMph, sunshineMin], hour) => ({
          stationId,
          date: '2026-07-01',
          hour,
          tempF,
          precipTrace: false,
          windDir,
          windSpeedMph,
          sunshineMin,
          // Only a few hours record sky cover, visibility and weather.
          ...(hour === 6 && {
            skyCover: 6,
            visibilityMi: 35,
            presentWeather: '0',
            humidityPct: 80,
            remarks: 'test',
          }),
          ...(hour === 9 && {
            skyCover: 1,
            visibilityMi: 30,
            presentWeather: '0',
            humidityPct: 66,
          }),
        })),
      )
      .onConflict((oc) => oc.columns(['stationId', 'date', 'hour']).doNothing())
      .execute();

    const sched = { stationId, date: '2026-07-01', precipTrace: false };
    await trx
      .insertInto('scheduled_observations')
      .values([
        {
          ...sched,
          obsTime: '07:00',
          stationPressureIn: 29.285,
          attachedThermC: 21.3,
          observedBarometerMb: 995.5,
          pressureCorrectionMb: -3.8,
          dryBulbF: 72.2,
          wetBulbF: 67.9,
          dewpointF: 66,
          humidityPct: 80,
          maxTempF: 88,
          minTempF: 68,
          snowfallIn: 0,
          snowDepthIn: 0,
          vaporPressureMb: 21.8,
        },
        {
          ...sched,
          obsTime: '19:00',
          stationPressureIn: 29.268,
          dryBulbF: 83,
          dewpointF: 75,
          humidityPct: 76,
          vaporPressureMb: 29.6,
        },
      ])
      .onConflict((oc) =>
        oc.columns(['stationId', 'date', 'obsTime']).doNothing(),
      )
      .execute();

    await actAs(recordsImport);
    const rec = { stationId, importId: recordsImport };
    await trx
      .insertInto('daily_records')
      .values([
        {
          ...rec,
          month: 1,
          day: 1,
          highF: 50,
          highYears: [1930],
          lowF: -18,
          lowYears: [2014, 1977],
          precipIn: 6.14,
          precipYears: [1907],
          snowIn: 18.5,
          snowYears: [2019],
          peakGustMph: 111,
          peakGustDir: 'NW',
          peakGustIsEstimated: true,
          peakGustYears: [2013],
          notes: 'test',
        },
        {
          ...rec,
          month: 1,
          day: 4,
          highF: 38,
          highYears: [2011],
          lowF: 6,
          lowYears: [2010],
          precipIn: 2.97,
          precipYears: [1919],
          snowIn: 11.1,
          snowYears: [1927, 1903],
          peakGustMph: 80,
          peakGustDir: 'NW',
          peakGustIsEstimated: true,
          peakGustYears: [1979],
          notes: 'test',
        },
        {
          // "None" for snow: value and years are both null.
          ...rec,
          month: 5,
          day: 1,
          highF: 83,
          highYears: [1954],
          lowF: 38,
          lowYears: [2001],
          precipIn: 2.64,
          precipYears: [1961, 1920],
          snowIn: null,
          snowYears: null,
          peakGustMph: 48,
          peakGustDir: 'E',
          peakGustIsEstimated: false,
          peakGustYears: [1997, 2015],
          notes: 'test',
        },
      ])
      .onConflict((oc) => oc.columns(['stationId', 'month', 'day']).doNothing())
      .execute();
  });
}
