import { readCsv } from './csv';

describe('readCsv', () => {
  it('splits rows and fields', () => {
    expect(readCsv('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('keeps commas, newlines, and escaped quotes inside quoted fields', () => {
    expect(readCsv('"2014, 1977","line\nbreak","say ""hi"""')).toEqual([
      ['2014, 1977', 'line\nbreak', 'say "hi"'],
    ]);
  });

  it('handles CRLF, a byte order mark, and a trailing newline', () => {
    expect(readCsv('﻿a,b\r\n1,\r\n')).toEqual([
      ['a', 'b'],
      ['1', ''],
    ]);
  });
});
