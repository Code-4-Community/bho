import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';

// Uploads live in S3, or in the LOCAL_UPLOAD_DIR folder when that is set (local
// dev only). Upload URLs point at UPLOAD_BUCKET_NAME; reads take the bucket
// from the S3 event.

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

// By default the SDK signs a CRC32 of the (empty) request body into presigned
// URLs, so S3 would reject the real file. See docs/upload-keys.md.
const s3 = new S3Client({ requestChecksumCalculation: 'WHEN_REQUIRED' });

// Served by the internal-serving-lambda dev server.
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
      // The presigner leaves content-type unsigned unless told otherwise.
      // Signing it makes S3 reject uploads that don't send contentType.
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

// Callers must validate the key: it is joined onto LOCAL_UPLOAD_DIR as is.
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
