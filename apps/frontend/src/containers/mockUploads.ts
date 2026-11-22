import { useCallback, useEffect, useRef, useState } from 'react';
import type { FileRejection } from '@components/UploadFile';

// Mock data for the /dev/uploads preview page only.

export const mockCsv = (name = 'FileName.csv') =>
  new File(['a,b\n1,2'], name, { type: 'text/csv' });

export const mockPdf = () =>
  new File(['%PDF-1.4'], 'FileName.pdf', { type: 'application/pdf' });

/** A tiny file that reports 2 GB, so it fails the 1 GB limit without allocating anything. */
export const mockOversizedCsv = () => {
  const file = mockCsv('TooBig.csv');
  Object.defineProperty(file, 'size', { value: 2 * 1024 ** 3 });
  return file;
};

/** Matches the FileRejected design in Figma. */
export const mockRejections: FileRejection[] = [
  { item: 'FileName.pdf', reason: 'Incorrect file format' },
  { item: 'Date []', reason: 'Missing required field' },
];

/** Fakes an upload: progress steps from 0 to 100, then resets so the demo can be repeated. */
export function useFakeUpload(stepMs = 120) {
  const [progress, setProgress] = useState<number | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setInterval>>();
  const resetTimer = useRef<ReturnType<typeof setTimeout>>();

  const stop = useCallback(() => {
    clearInterval(timer.current);
    clearTimeout(resetTimer.current);
    setProgress(undefined);
  }, []);

  const start = useCallback(() => {
    stop();
    setProgress(0);
    timer.current = setInterval(() => {
      setProgress((current = 0) => {
        const next = Math.min(100, current + 7);
        if (next === 100) {
          clearInterval(timer.current);
          resetTimer.current = setTimeout(() => setProgress(undefined), 800);
        }
        return next;
      });
    }, stepMs);
  }, [stepMs, stop]);

  useEffect(() => stop, [stop]);

  return { progress, start, stop };
}
