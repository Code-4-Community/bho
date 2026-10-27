import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { mockClient } from 'aws-sdk-client-mock';
import { createPresignedUploadUrl, UploadType } from '../presigned-upload-url';

jest.mock('@aws-sdk/s3-request-presigner', () => {
  const actual = jest.requireActual('@aws-sdk/s3-request-presigner');
  return { ...actual, getSignedUrl: jest.fn(actual.getSignedUrl) };
});

const BUCKET = 'bho-uploads';
const UUID_CSV =
  '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.csv';

const buildS3 = (
  requestChecksumCalculation:
    | 'WHEN_REQUIRED'
    | 'WHEN_SUPPORTED' = 'WHEN_REQUIRED',
) =>
  new S3Client({
    region: 'us-east-1',
    credentials: { accessKeyId: 'test-key', secretAccessKey: 'test-secret' },
    requestChecksumCalculation,
  });

describe('createPresignedUploadUrl', () => {
  let s3: S3Client;
  let s3Mock: ReturnType<typeof mockClient>;

  const presign = (uploadType: UploadType, fileName: string) =>
    createPresignedUploadUrl({ s3, bucket: BUCKET, uploadType, fileName });

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-10-26T12:00:00Z') });
    s3 = buildS3();
    s3Mock = mockClient(s3);
  });

  afterEach(() => {
    s3Mock.restore();
    jest.useRealTimers();
  });

  it.each(['daily', 'historical'] as const)(
    'builds a %s key server-side and signs a PUT for it',
    async (uploadType) => {
      const { url, key } = await presign(uploadType, 'obs.csv');

      expect(key).toMatch(new RegExp(`^${uploadType}/2026-10-26/${UUID_CSV}$`));
      expect(new URL(url).host).toBe(`${BUCKET}.s3.us-east-1.amazonaws.com`);
      expect(new URL(url).pathname).toBe(`/${key}`);
      expect(new URL(url).searchParams.get('x-id')).toBe('PutObject');
    },
  );

  it('ignores the client file name when building the key', async () => {
    const { key } = await presign('daily', '../../historical/evil.csv');

    expect(key).toMatch(new RegExp(`^daily/2026-10-26/${UUID_CSV}$`));
  });

  it('expires in 5 minutes', async () => {
    const { url } = await presign('daily', 'obs.csv');

    expect(new URL(url).searchParams.get('X-Amz-Expires')).toBe('300');
  });

  it('only accepts uploads sent as text/csv', async () => {
    const { url } = await presign('daily', 'obs.csv');

    const [, command] = jest.mocked(getSignedUrl).mock.lastCall ?? [];
    expect(command?.input).toMatchObject({ ContentType: 'text/csv' });
    expect(
      new URL(url).searchParams.get('X-Amz-SignedHeaders')?.split(';'),
    ).toContain('content-type');
  });

  it('does not sign a checksum into the URL', async () => {
    const { url } = await presign('daily', 'obs.csv');

    expect(url).not.toMatch(/x-amz-checksum|x-amz-sdk-checksum-algorithm/);
  });

  it('signs the URL locally without calling S3', async () => {
    await presign('daily', 'obs.csv');

    expect(s3Mock.calls()).toHaveLength(0);
  });

  it('accepts an uppercase .CSV extension', async () => {
    const { key } = await presign('daily', 'OBS.CSV');

    expect(key).toMatch(/\.csv$/);
  });

  it.each(['obs.xlsx', 'obs.csv.txt', 'obs', 'csv'])(
    'rejects %s',
    async (fileName) => {
      await expect(presign('daily', fileName)).rejects.toThrow(
        `Only .csv files can be uploaded, got: ${fileName}`,
      );
    },
  );

  it('rejects an unknown upload type', async () => {
    await expect(presign('weekly' as UploadType, 'obs.csv')).rejects.toThrow(
      'Unknown upload type: weekly',
    );
  });

  it('rejects an S3 client that would sign a checksum', async () => {
    s3 = buildS3('WHEN_SUPPORTED');

    await expect(presign('daily', 'obs.csv')).rejects.toThrow(
      "The S3 client must be created with requestChecksumCalculation: 'WHEN_REQUIRED'",
    );
  });
});
