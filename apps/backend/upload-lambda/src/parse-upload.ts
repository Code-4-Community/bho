import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { ParseResult } from '@bho/weather-parsing';
import { createHash } from 'crypto';
import type { S3ObjectLocation } from './handler';

const s3 = new S3Client({});

// Reads an upload and runs the parser for its type (parseHistorical or
// parseDaily). A bad file comes back as { ok: false, errors } for staff to fix.
// S3 errors are not caught: the upload is fine, so the Lambda should fail and
// be retried. fileHash is the SHA-256 of the raw bytes, for imports.fileHash.
export const parseUpload = async <T>(
  { bucket, key }: S3ObjectLocation,
  parse: (csv: string) => ParseResult<T>,
): Promise<{ fileHash: string; result: ParseResult<T> }> => {
  const { Body } = await s3.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  const bytes = Buffer.from((await Body?.transformToByteArray()) ?? []);
  return {
    fileHash: createHash('sha256').update(bytes).digest('hex'),
    result: parse(bytes.toString('utf-8')),
  };
};
