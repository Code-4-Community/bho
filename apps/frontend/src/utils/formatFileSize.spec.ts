import { formatFileSize } from './formatFileSize';

describe('formatFileSize', () => {
  it.each([
    [0, '0 B'],
    [1, '1 B'],
    [1023, '1023 B'],
    [1024, '1 KB'],
    [1536, '1.5 KB'],
    [3 * 1024 ** 2, '3 MB'],
    [1024 ** 3, '1 GB'],
    [2.5 * 1024 ** 3, '2.5 GB'],
  ])('formats %d bytes as %s', (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected);
  });

  it('rolls 1023.96 KB up to 1 MB instead of showing 1024 KB', () => {
    expect(formatFileSize(1024 * 1023.96)).toBe('1 MB');
  });

  it('treats negative and non-finite sizes as 0 B', () => {
    expect(formatFileSize(-5)).toBe('0 B');
    expect(formatFileSize(Number.NaN)).toBe('0 B');
  });
});
