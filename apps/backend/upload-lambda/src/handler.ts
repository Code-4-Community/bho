import type { S3Event } from 'aws-lambda';

export interface S3ObjectLocation {
  bucket: string;
  key: string;
}

export const extractS3ObjectLocations = (event: S3Event): S3ObjectLocation[] =>
  event.Records.map((record) => ({
    bucket: record.s3.bucket.name,
    key: decodeURIComponent(record.s3.object.key.replace(/\+/g, ' ')),
  }));

export const handler = async (event: S3Event): Promise<void> => {
  for (const { bucket, key } of extractS3ObjectLocations(event)) {
    console.log(`Received upload: bucket=${bucket}, key=${key}`);
  }
};
