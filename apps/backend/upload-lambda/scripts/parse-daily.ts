// Parses a daily-sheet CSV and writes one JSON file per day, named by date.
//
//   yarn parse:daily [csv] [outDir]
//
// csv     defaults to src/parsers/__fixtures__/daily.csv
// outDir  defaults to output/daily (git-ignored); its *.json files are cleared first
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { join, resolve } from 'path';
import { parseDaily } from '../src/parsers/daily';

const root = join(__dirname, '..');
const csvPath = resolve(
  process.argv[2] ?? join(root, 'src/parsers/__fixtures__/daily.csv'),
);
const outDir = resolve(process.argv[3] ?? join(root, 'output/daily'));

const result = parseDaily(readFileSync(csvPath, 'utf8'));
if (result.ok === false) {
  console.error(`${csvPath} did not parse:`);
  for (const e of result.errors) {
    console.error(`  row ${e.row ?? '-'} [${e.column ?? '-'}]: ${e.reason}`);
  }
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
for (const name of readdirSync(outDir)) {
  if (name.endsWith('.json')) rmSync(join(outDir, name));
}
for (const day of result.rows) {
  writeFileSync(
    join(outDir, `${day.daily.date}.json`),
    `${JSON.stringify(day, null, 2)}\n`,
  );
}
console.log(`Wrote ${result.rows.length} days from ${csvPath} to ${outDir}`);
