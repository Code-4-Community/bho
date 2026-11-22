import type { ErrorLogEntry } from '@api/types';

export const mockErrorLog: ErrorLogEntry[] = [
  {
    id: 6,
    occurredAt: '2026-10-31T14:22:30Z',
    source: 'WeatherLink',
    description: 'timeout for 3 seconds',
    retryCount: 2,
    outcome: 'succeeded',
  },
  {
    id: 5,
    occurredAt: '2026-10-31T14:07:12Z',
    source: 'APRSWxNet',
    description: 'auth token expired',
    retryCount: 2,
    outcome: 'retrying',
  },
  {
    id: 4,
    occurredAt: '2026-10-31T13:51:48Z',
    source: 'Weather Underground',
    description: 'rate limited',
    retryCount: 3,
    outcome: 'failed',
  },
  {
    id: 3,
    occurredAt: '2026-10-31T09:15:05Z',
    source: 'WeatherLink',
    description: 'timeout for 3 seconds',
    retryCount: 1,
    outcome: 'succeeded',
  },
  {
    id: 2,
    occurredAt: '2026-10-30T22:40:59Z',
    source: 'APRSWxNet',
    description: 'timeout for 3 seconds',
    retryCount: 1,
    outcome: 'succeeded',
  },
  {
    id: 1,
    occurredAt: '2026-10-30T03:02:17Z',
    source: 'Weather Underground',
    description: 'timeout for 3 seconds',
    retryCount: 2,
    outcome: 'succeeded',
  },
];
