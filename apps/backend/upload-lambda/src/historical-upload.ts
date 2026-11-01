import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { HistoricalRecord, ParseResult } from '@bho/weather-parsing';
import { createHash } from 'crypto';
import type { S3ObjectLocation } from './handler';
import { parseHistorical } from './parsers/historical';

const s3 = new S3Client({});

// A bad file comes back as { ok: false, errors } for staff to fix. S3 errors
// are not caught: the upload is fine, so the Lambda should fail and be retried.
// fileHash is the SHA-256 of the raw bytes, for imports.fileHash.
export const parseHistoricalUpload = async ({
  bucket,
  key,
}: S3ObjectLocation): Promise<{
  fileHash: string;
  result: ParseResult<HistoricalRecord>;
}> => {
  const { Body } = await s3.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  const bytes = Buffer.from((await Body?.transformToByteArray()) ?? []);
  return {
    fileHash: createHash('sha256').update(bytes).digest('hex'),
    result: parseHistorical(bytes.toString('utf-8')),
  };
};
