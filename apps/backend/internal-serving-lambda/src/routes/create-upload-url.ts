import { randomUUID } from 'crypto';
import { createUploadUrl } from '@bho/file-store';
import type { RouteHandler } from '../routes';
import { response } from '../response';
import { getCurrentUser } from '../auth';
import { UPLOAD_TYPES, type UploadType } from '../imports';

const UPLOAD_URL_EXPIRES_IN_SECONDS = 300;

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

// POST /imports/upload-url/{kind}, body { fileName }
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

  // <uploadType>/<UTC date>/<uuid>.csv. See docs/upload-keys.md.
  const date = new Date().toISOString().slice(0, 10);
  const key = `${kind}/${date}/${randomUUID()}.csv`;

  const url = await createUploadUrl({
    key,
    contentType: 'text/csv',
    expiresInSeconds: UPLOAD_URL_EXPIRES_IN_SECONDS,
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
