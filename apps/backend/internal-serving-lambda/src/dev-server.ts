import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  createServer,
  type IncomingMessage,
  type OutgoingHttpHeaders,
  type ServerResponse,
} from 'http';
import { writeLocalUpload } from '@bho/file-store';
import { handler } from './handler';
import { UPLOAD_TYPES } from './imports';
import { response } from './response';
import { routes } from './routes';

const PORT = 3000;
const UPLOADS_PATH = '/local-uploads/';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

const ROUTES = Object.keys(routes).map((routeKey) => {
  const [method, resource] = routeKey.split(' ');
  const pattern = resource.replace(/\{(\w+)\}/g, '(?<$1>[^/]+)');
  return { method, resource, pattern: new RegExp(`^${pattern}$`) };
});

// With no matching route, resource stays the path and the handler 404s.
const toEvent = (
  req: IncomingMessage,
  url: URL,
  body: Buffer,
): APIGatewayProxyEvent => {
  let resource = url.pathname;
  let pathParameters: Record<string, string> | null = null;
  for (const route of ROUTES) {
    const match =
      route.method === req.method && url.pathname.match(route.pattern);
    if (match) {
      resource = route.resource;
      pathParameters = match.groups ?? null;
      break;
    }
  }

  // rawHeaders keeps the client's casing, like API Gateway
  const headers: Record<string, string> = {};
  const multiValueHeaders: Record<string, string[]> = {};
  for (let i = 0; i < req.rawHeaders.length; i += 2) {
    const [name, value] = [req.rawHeaders[i], req.rawHeaders[i + 1]];
    headers[name] = value;
    (multiValueHeaders[name] ??= []).push(value);
  }

  const query = url.searchParams;
  const queryNames = [...new Set(query.keys())];

  return {
    resource,
    path: url.pathname,
    httpMethod: req.method ?? 'GET',
    headers,
    multiValueHeaders,
    queryStringParameters: queryNames.length ? Object.fromEntries(query) : null,
    multiValueQueryStringParameters: queryNames.length
      ? Object.fromEntries(queryNames.map((name) => [name, query.getAll(name)]))
      : null,
    pathParameters,
    stageVariables: null,
    // No route reads it yet
    requestContext: {} as APIGatewayProxyEvent['requestContext'],
    body: body.length ? body.toString('utf-8') : null,
    isBase64Encoded: false,
  };
};

const putLocalUpload = async (
  req: IncomingMessage,
  url: URL,
  body: Buffer,
): Promise<APIGatewayProxyResult> => {
  const key = decodeURIComponent(url.pathname.slice(UPLOADS_PATH.length));
  // An encoded traversal like "..%2F" survives URL parsing.
  if (
    !UPLOAD_TYPES.some((type) => key.startsWith(`${type}/`)) ||
    key.split('/').includes('..')
  ) {
    return response(400, {
      message: `Key must start with one of: ${UPLOAD_TYPES.map(
        (type) => `${type}/`,
      ).join(', ')}`,
    });
  }
  // Matches S3, where the presigned URL signs Content-Type
  if (req.headers['content-type'] !== 'text/csv') {
    return response(403, { message: 'Content-Type must be text/csv' });
  }

  await writeLocalUpload(key, body);
  return { statusCode: 200, body: '' };
};

const readBody = async (req: IncomingMessage): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
};

const send = (
  res: ServerResponse,
  { statusCode, headers, body }: APIGatewayProxyResult,
) => {
  res
    .writeHead(statusCode, {
      ...CORS_HEADERS,
      ...(headers as OutgoingHttpHeaders),
    })
    .end(body);
};

export const devServer = createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      return send(res, { statusCode: 204, body: '' });
    }
    const url = new URL(req.url ?? '/', 'http://localhost');
    const body = await readBody(req);
    send(
      res,
      req.method === 'PUT' && url.pathname.startsWith(UPLOADS_PATH)
        ? await putLocalUpload(req, url, body)
        : await handler(toEvent(req, url, body)),
    );
  } catch (err) {
    console.error(err);
    send(res, response(500, { message: 'Internal server error' }));
  }
});

if (require.main === module) {
  devServer.listen(PORT, 'localhost', () =>
    console.log(`Local API on http://localhost:${PORT}`),
  );
}
