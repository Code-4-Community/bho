import { S3Client } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { createUploadUrl, readUpload, writeLocalUpload } from './index';

const KEY = 'daily/2026-10-26/3f2b6c1e-8a4d-4b7e-9c2f-1d5e6a7b8c9d.csv';
const request = {
  key: KEY,
  contentType: 'text/csv',
  expiresInSeconds: 300,
};

const env = process.env;
afterEach(() => {
  process.env = env;
});

describe('with LOCAL_UPLOAD_DIR', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'file-store-'));
    process.env = { ...env, LOCAL_UPLOAD_DIR: dir };
    delete process.env.UPLOAD_BUCKET_NAME;
  });

  afterEach(() => rm(dir, { recursive: true, force: true }));

  it('points the upload URL at the dev server, without a bucket', async () => {
    expect(await createUploadUrl(request)).toBe(
      `http://localhost:3000/local-uploads/${KEY}`,
    );
  });

  it('reads back a written file from the folder', async () => {
    await writeLocalUpload(KEY, Buffer.from('a,b\n1,2'));

    const bytes = await readUpload({ bucket: 'ignored', key: KEY });

    expect(bytes.toString()).toBe('a,b\n1,2');
  });
});

describe('with S3', () => {
  const s3Mock = mockClient(S3Client);

  beforeEach(() => {
    s3Mock.reset();
    process.env = {
      ...env,
      AWS_REGION: 'us-east-1',
      AWS_ACCESS_KEY_ID: 'test',
      AWS_SECRET_ACCESS_KEY: 'test',
      UPLOAD_BUCKET_NAME: 'bho-uploads',
    };
    delete process.env.LOCAL_UPLOAD_DIR;
  });

  it('signs a PUT for the key in the upload bucket', async () => {
    const url = new URL(await createUploadUrl(request));

    expect(url.host).toBe('bho-uploads.s3.us-east-1.amazonaws.com');
    expect(url.pathname).toBe(`/${KEY}`);
    expect(url.searchParams.get('x-id')).toBe('PutObject');
    expect(url.searchParams.get('X-Amz-Expires')).toBe('300');
  });

  it('only accepts uploads sent with the content type', async () => {
    const url = new URL(await createUploadUrl(request));

    expect(url.searchParams.get('X-Amz-SignedHeaders')?.split(';')).toContain(
      'content-type',
    );
  });

  it('does not sign a checksum into the URL', async () => {
    expect(await createUploadUrl(request)).not.toMatch(
      /x-amz-checksum|x-amz-sdk-checksum-algorithm/,
    );
  });

  it('signs the URL locally without calling S3', async () => {
    await createUploadUrl(request);

    expect(s3Mock.calls()).toHaveLength(0);
  });

  it('throws when the bucket name is not configured', async () => {
    delete process.env.UPLOAD_BUCKET_NAME;

    await expect(createUploadUrl(request)).rejects.toThrow(
      'UPLOAD_BUCKET_NAME is not set',
    );
  });
});
