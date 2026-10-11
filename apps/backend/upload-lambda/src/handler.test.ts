import type { S3Event, S3EventRecord } from 'aws-lambda';
import { extractS3ObjectLocations, handler } from './handler';

const buildS3Record = (bucket: string, key: string): S3EventRecord => ({
  eventVersion: '2.1',
  eventSource: 'aws:s3',
  awsRegion: 'us-east-1',
  eventTime: '2026-10-08T12:00:00.000Z',
  eventName: 'ObjectCreated:Put',
  userIdentity: { principalId: 'EXAMPLE' },
  requestParameters: { sourceIPAddress: '127.0.0.1' },
  responseElements: {
    'x-amz-request-id': 'EXAMPLE123456789',
    'x-amz-id-2': 'EXAMPLE123/abcdefghijklmnopqrstuvwxyz',
  },
  s3: {
    s3SchemaVersion: '1.0',
    configurationId: 'testConfigRule',
    bucket: {
      name: bucket,
      ownerIdentity: { principalId: 'EXAMPLE' },
      arn: `arn:aws:s3:::${bucket}`,
    },
    object: {
      key,
      size: 1024,
      eTag: '0123456789abcdef0123456789abcdef',
      sequencer: '0A1B2C3D4E5F678901',
    },
  },
});

const buildS3Event = (...records: S3EventRecord[]): S3Event => ({
  Records: records,
});

describe('extractS3ObjectLocations', () => {
  it('extracts the bucket and key from a single record', () => {
    const event = buildS3Event(buildS3Record('bho-uploads', 'daily-obs.csv'));

    expect(extractS3ObjectLocations(event)).toEqual([
      { bucket: 'bho-uploads', key: 'daily-obs.csv' },
    ]);
  });

  it('extracts every record in order', () => {
    const event = buildS3Event(
      buildS3Record('bho-uploads', 'first.csv'),
      buildS3Record('bho-uploads', 'second.xlsx'),
      buildS3Record('bho-archive', 'third.csv'),
    );

    expect(extractS3ObjectLocations(event)).toEqual([
      { bucket: 'bho-uploads', key: 'first.csv' },
      { bucket: 'bho-uploads', key: 'second.xlsx' },
      { bucket: 'bho-archive', key: 'third.csv' },
    ]);
  });

  it('decodes URL-encoded keys', () => {
    const event = buildS3Event(
      buildS3Record('bho-uploads', 'uploads/BHO+Daily+Obs+%232.csv'),
    );

    expect(extractS3ObjectLocations(event)).toEqual([
      { bucket: 'bho-uploads', key: 'uploads/BHO Daily Obs #2.csv' },
    ]);
  });

  it('returns an empty array when the event has no records', () => {
    expect(extractS3ObjectLocations(buildS3Event())).toEqual([]);
  });
});

describe('handler', () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('logs the bucket and key for each record', async () => {
    const event = buildS3Event(
      buildS3Record('bho-uploads', 'first.csv'),
      buildS3Record('bho-uploads', 'second.xlsx'),
    );

    await expect(handler(event)).resolves.toBeUndefined();

    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenNthCalledWith(
      1,
      'Received upload: bucket=bho-uploads, key=first.csv',
    );
    expect(logSpy).toHaveBeenNthCalledWith(
      2,
      'Received upload: bucket=bho-uploads, key=second.xlsx',
    );
  });

  it('logs nothing when the event has no records', async () => {
    await handler(buildS3Event());

    expect(logSpy).not.toHaveBeenCalled();
  });
});
