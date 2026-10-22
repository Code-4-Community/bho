import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { HistoricalRecord, ParseResult } from '@bho/weather-parsing';
import type { S3ObjectLocation } from './handler';
import { parseHistorical } from './parsers/historical';

const s3 = new S3Client({});

// A bad file comes back as { ok: false, errors } for staff to fix. S3 errors
// are not caught: the upload is fine, so the Lambda should fail and be retried.
export const parseHistoricalUpload = async ({
  bucket,
  key,
}: S3ObjectLocation): Promise<ParseResult<HistoricalRecord>> => {
  const { Body } = await s3.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  return parseHistorical((await Body?.transformToString('utf-8')) ?? '');
};
