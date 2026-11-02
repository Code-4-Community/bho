import { S3Client } from '@aws-sdk/client-s3';
import type { RouteHandler } from '../routes';
import { response } from '../response';
import { getCurrentUser } from '../auth';
import {
  createPresignedUploadUrl,
  UPLOAD_TYPES,
  UPLOAD_URL_EXPIRES_IN_SECONDS,
  type UploadType,
} from '../presigned-upload-url';

// The presign helper requires WHEN_REQUIRED. See docs/upload-keys.md.
const s3 = new S3Client({ requestChecksumCalculation: 'WHEN_REQUIRED' });

const isUploadType = (value: unknown): value is UploadType =>
  UPLOAD_TYPES.includes(value as UploadType);

const parseFileName = (body: string | null): string | null => {
  try {
    const { fileName } = JSON.parse(body ?? '');
    return typeof fileName === 'string' && fileName.trim() ? fileName : null;
  } catch {
    return null;
  }
};

// POST /imports/{kind}, body { fileName }
export const createUploadUrlHandler: RouteHandler = async (event) => {
  const user = await getCurrentUser(event);
  if (!user) return response(401, { message: 'Unauthorized' });

  const kind = event.pathParameters?.kind;
  if (!isUploadType(kind)) {
    return response(400, {
      message: `kind must be one of: ${UPLOAD_TYPES.join(', ')}`,
    });
  }

  const fileName = parseFileName(event.body);
  if (!fileName) {
    return response(400, { message: 'Body must include a fileName' });
  }
  if (!fileName.toLowerCase().endsWith('.csv')) {
    return response(400, { message: 'Only .csv files can be uploaded' });
  }

  const bucket = process.env.UPLOAD_BUCKET_NAME;
  if (!bucket) throw new Error('UPLOAD_BUCKET_NAME is not set');

  const { url, key } = await createPresignedUploadUrl({
    s3,
    bucket,
    uploadType: kind,
    fileName,
    // S3 metadata values must be ASCII, so the file name is URI-encoded
    metadata: {
      'uploaded-by': user.id,
      'file-name': encodeURIComponent(fileName),
    },
  });
  const expiresAt = new Date(
    Date.now() + UPLOAD_URL_EXPIRES_IN_SECONDS * 1000,
  ).toISOString();

  return response(200, { uploadUrl: url, s3Key: key, expiresAt });
};
