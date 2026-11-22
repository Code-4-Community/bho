# upsert

Everything that takes parsed data and writes it to the database: diffing
against the stored day (`diffDays.ts`), building the write plan
(`planDailyWrite.ts`, `toDbRows.ts`), and applying it (`writeDaily.ts`).
Nothing here parses files.
