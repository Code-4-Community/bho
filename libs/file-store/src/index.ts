import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';

// Upload URLs use UPLOAD_BUCKET_NAME. Reads take the bucket from the S3 event.

export interface UploadLocation {
  bucket: string;
  key: string;
}

export interface UploadUrlRequest {
  key: string;
  contentType: string;
  expiresInSeconds: number;
  metadata?: Record<string, string>;
}

// The SDK default signs an empty-body checksum into presigned URLs, so S3
// rejects the real file.
const s3 = new S3Client({ requestChecksumCalculation: 'WHEN_REQUIRED' });

// internal-serving-lambda's dev server
const LOCAL_UPLOAD_URL = 'http://localhost:3000/local-uploads/';

export const createUploadUrl = async ({
  key,
  contentType,
  expiresInSeconds,
  metadata,
}: UploadUrlRequest): Promise<string> => {
  if (process.env.LOCAL_UPLOAD_DIR) return LOCAL_UPLOAD_URL + key;

  const bucket = process.env.UPLOAD_BUCKET_NAME;
  if (!bucket) throw new Error('UPLOAD_BUCKET_NAME is not set');

  return getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      Metadata: metadata,
    }),
    {
      expiresIn: expiresInSeconds,
      // Unsigned by default. Signing it makes S3 reject other content types.
      signableHeaders: new Set(['content-type']),
    },
  );
};

export const readUpload = async ({
  bucket,
  key,
}: UploadLocation): Promise<Buffer> => {
  const dir = process.env.LOCAL_UPLOAD_DIR;
  if (dir) return readFile(join(dir, key));

  const { Body } = await s3.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  return Buffer.from((await Body?.transformToByteArray()) ?? []);
};

// The key is joined onto LOCAL_UPLOAD_DIR unchecked, so callers must validate it.
export const writeLocalUpload = async (
  key: string,
  bytes: Uint8Array,
): Promise<void> => {
  const dir = process.env.LOCAL_UPLOAD_DIR;
  if (!dir) throw new Error('LOCAL_UPLOAD_DIR is not set');

  const path = join(dir, key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes);
};
