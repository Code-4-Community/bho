import { randomUUID } from 'crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const UPLOAD_TYPES = ['daily', 'historical'] as const;
export type UploadType = (typeof UPLOAD_TYPES)[number];

export const UPLOAD_URL_EXPIRES_IN_SECONDS = 300;
export const CSV_CONTENT_TYPE = 'text/csv';

export interface PresignedUploadUrlRequest {
  s3: S3Client;
  bucket: string;
  uploadType: UploadType;
  fileName: string;
}

export interface PresignedUploadUrl {
  url: string;
  key: string;
}

// Key format: <uploadType>/<UTC date>/<uuid>.csv. See docs/upload-keys.md.
export const createPresignedUploadUrl = async ({
  s3,
  bucket,
  uploadType,
  fileName,
}: PresignedUploadUrlRequest): Promise<PresignedUploadUrl> => {
  if (!UPLOAD_TYPES.includes(uploadType)) {
    throw new Error(`Unknown upload type: ${uploadType}`);
  }
  if (!fileName.toLowerCase().endsWith('.csv')) {
    throw new Error(`Only .csv files can be uploaded, got: ${fileName}`);
  }
  // By default the SDK signs a CRC32 of the (empty) request body into the
  // URL, so S3 would reject the real file.
  if ((await s3.config.requestChecksumCalculation()) !== 'WHEN_REQUIRED') {
    throw new Error(
      "The S3 client must be created with requestChecksumCalculation: 'WHEN_REQUIRED'",
    );
  }

  const date = new Date().toISOString().slice(0, 10);
  const key = `${uploadType}/${date}/${randomUUID()}.csv`;

  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: CSV_CONTENT_TYPE,
    }),
    {
      expiresIn: UPLOAD_URL_EXPIRES_IN_SECONDS,
      // The presigner leaves content-type unsigned unless told otherwise.
      // Signing it makes S3 reject uploads that don't send text/csv.
      signableHeaders: new Set(['content-type']),
    },
  );

  return { url, key };
};
