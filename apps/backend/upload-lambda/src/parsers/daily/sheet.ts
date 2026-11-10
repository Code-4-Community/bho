import type { RowError } from '@bho/weather-parsing';
import { Row, rowAt } from './cells';

// One day's rows, from its "DATE:" row to the next day's.
export class Day {
  constructor(
    private table: string[][],
    private errors: RowError[],
    readonly start: number,
    private end: number,
  ) {}

  fail(index: number, column: string, reason: string) {
    this.errors.push({ row: index + 1, column, reason });
  }

  row(index: number): Row {
    return rowAt(this.table, index, this.errors);
  }

  // First matching row in this day, or -1.
  find(test: (cells: string[]) => boolean): number {
    for (let i = this.start; i < this.end; i++) {
      if (test(this.table[i])) return i;
    }
    return -1;
  }

  // Like find, but a missing row is an error on the "DATE:" row.
  require(label: string, test: (cells: string[]) => boolean): number {
    const index = this.find(test);
    if (index === -1) {
      this.errors.push({ row: this.start + 1, reason: `No "${label}" row` });
    }
    return index;
  }

  labelled(label: string): Row {
    return this.row(this.require(label, (cells) => cells[0] === label));
  }

  rows(test: (cells: string[]) => boolean): number[] {
    const indexes: number[] = [];
    for (let i = this.start; i < this.end; i++) {
      if (test(this.table[i])) indexes.push(i);
    }
    return indexes;
  }

  // Reports repeated keys (e.g. two "05-06" rows), keeping the first of each.
  unique(indexes: number[], column: string, keyOf: (index: number) => string) {
    const seen = new Map<string, number>();
    return indexes.filter((index) => {
      const key = keyOf(index);
      const first = seen.get(key);
      if (first === undefined) {
        seen.set(key, index);
        return true;
      }
      this.fail(index, column, `${key} is also on row ${first + 1}`);
      return false;
    });
  }
}
