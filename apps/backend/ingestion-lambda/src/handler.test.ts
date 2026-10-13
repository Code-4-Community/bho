import type { ScheduledEvent } from 'aws-lambda';
import { handler } from './handler';

const buildScheduledEvent = (
  overrides: Partial<ScheduledEvent> = {},
): ScheduledEvent => ({
  version: '0',
  id: '89d1a02d-5ec7-412e-82f5-13505f849b41',
  'detail-type': 'Scheduled Event',
  source: 'aws.events',
  account: '123456789012',
  time: '2026-10-08T12:00:00Z',
  region: 'us-east-1',
  resources: [
    'arn:aws:events:us-east-1:123456789012:rule/ingestion-lambda-schedule',
  ],
  detail: {},
  ...overrides,
});

describe('ingestion-lambda handler', () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('logs the scheduled event with its trigger time', async () => {
    const event = buildScheduledEvent();

    await handler(event);

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(
      'Ingestion lambda triggered at 2026-10-08T12:00:00Z',
      event,
    );
  });

  it('logs the time from whichever event it receives', async () => {
    const event = buildScheduledEvent({ time: '2027-01-01T00:00:00Z' });

    await handler(event);

    expect(logSpy).toHaveBeenCalledWith(
      'Ingestion lambda triggered at 2027-01-01T00:00:00Z',
      event,
    );
  });

  it('resolves without a return value', async () => {
    await expect(handler(buildScheduledEvent())).resolves.toBeUndefined();
  });
});
