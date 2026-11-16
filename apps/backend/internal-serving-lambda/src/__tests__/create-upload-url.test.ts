import type { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../handler';
import { getCurrentUser } from '../auth';
import { createUploadUrlHandler } from '../routes/create-upload-url';

jest.mock('../auth');

const BUCKET = 'bho-uploads';
const UUID_CSV =
  '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.csv';

const buildEvent = (
  kind: string,
  body: unknown = { fileName: 'obs.csv' },
): APIGatewayProxyEvent =>
  ({
    httpMethod: 'POST',
    resource: '/imports/upload-url/{kind}',
    path: `/imports/upload-url/${kind}`,
    headers: {},
    pathParameters: { kind },
    queryStringParameters: null,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  } as unknown as APIGatewayProxyEvent);

const call = async (event: APIGatewayProxyEvent) => {
  const result = await createUploadUrlHandler(event);
  return { statusCode: result.statusCode, body: JSON.parse(result.body) };
};

describe('createUploadUrlHandler', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = {
      ...env,
      AWS_REGION: 'us-east-1',
      AWS_ACCESS_KEY_ID: 'test',
      AWS_SECRET_ACCESS_KEY: 'test',
      UPLOAD_BUCKET_NAME: BUCKET,
    };
    jest.useFakeTimers({ now: new Date('2026-10-26T12:00:00Z') });
    jest.mocked(getCurrentUser).mockResolvedValue({ id: 'user-123' });
  });

  afterEach(() => {
    process.env = env;
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it.each(['daily', 'historical'])(
    'returns an upload URL for a %s import',
    async (kind) => {
      const { statusCode, body } = await call(buildEvent(kind));

      expect(statusCode).toBe(200);
      expect(body.s3Key).toMatch(
        new RegExp(`^${kind}/2026-10-26/${UUID_CSV}$`),
      );
      const url = new URL(body.uploadUrl);
      expect(url.host).toBe(`${BUCKET}.s3.us-east-1.amazonaws.com`);
      expect(url.pathname).toBe(`/${body.s3Key}`);
    },
  );

  it('expires in 5 minutes', async () => {
    const { body } = await call(buildEvent('daily'));

    expect(body.expiresAt).toBe('2026-10-26T12:05:00.000Z');
  });

  it('carries the uploader and file name as object metadata', async () => {
    const { body } = await call(
      buildEvent('daily', { fileName: 'July obs.csv' }),
    );

    const params = new URL(body.uploadUrl).searchParams;
    expect(params.get('x-amz-meta-uploaded-by')).toBe('user-123');
    expect(params.get('x-amz-meta-file-name')).toBe('July%20obs.csv');
  });

  it('returns 401 without a signed-in user', async () => {
    jest.mocked(getCurrentUser).mockResolvedValue(null);

    const { statusCode, body } = await call(buildEvent('daily'));

    expect(statusCode).toBe(401);
    expect(body).toEqual({ message: 'Unauthorized' });
  });

  it.each(['weekly', 'DAILY', ''])('returns 400 for kind %p', async (kind) => {
    const { statusCode, body } = await call(buildEvent(kind));

    expect(statusCode).toBe(400);
    expect(body).toEqual({
      message: 'kind must be one of: daily, historical',
    });
  });

  it.each([
    ['no body', null],
    ['invalid JSON', 'not json'],
    ['no fileName', {}],
    ['a non-string fileName', { fileName: 42 }],
    ['a blank fileName', { fileName: '   ' }],
  ])('returns 400 for %s', async (_case, body) => {
    const result = await call(buildEvent('daily', body));

    expect(result.statusCode).toBe(400);
    expect(result.body).toEqual({ message: 'Body must include a fileName' });
  });

  it.each(['obs.xlsx', 'obs.csv.txt', 'obs'])(
    'returns 400 for %s',
    async (fileName) => {
      const { statusCode, body } = await call(
        buildEvent('daily', { fileName }),
      );

      expect(statusCode).toBe(400);
      expect(body).toEqual({ message: 'Only .csv files can be uploaded' });
    },
  );

  it('throws when the bucket name is not configured', async () => {
    delete process.env.UPLOAD_BUCKET_NAME;

    await expect(createUploadUrlHandler(buildEvent('daily'))).rejects.toThrow(
      'UPLOAD_BUCKET_NAME is not set',
    );
  });
});

describe('POST /imports/upload-url/{kind} through the lambda handler', () => {
  it('routes to the create upload URL handler', async () => {
    jest.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await handler(buildEvent('daily'));

    expect(result.statusCode).toBe(401);
  });

  it('returns 404 for the POST /imports/{kind} path', async () => {
    const result = await handler({
      ...buildEvent('daily'),
      resource: '/imports/{kind}',
    });

    expect(result.statusCode).toBe(404);
  });
});
