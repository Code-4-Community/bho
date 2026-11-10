import type { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../handler';
import { healthHandler } from '../routes/health';

const buildEvent = (
  overrides: Partial<APIGatewayProxyEvent> = {},
): APIGatewayProxyEvent =>
  ({
    httpMethod: 'GET',
    resource: '/health',
    path: '/health',
    headers: {},
    pathParameters: null,
    queryStringParameters: null,
    body: null,
    ...overrides,
  } as APIGatewayProxyEvent);

describe('healthHandler', () => {
  it('returns 200 with status ok', async () => {
    const result = await healthHandler(buildEvent());

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ status: 'ok' });
  });

  it('sets the JSON content type', async () => {
    const result = await healthHandler(buildEvent());

    expect(result.headers).toEqual({ 'Content-Type': 'application/json' });
  });
});

describe('GET /health through the lambda handler', () => {
  it('routes to the health handler', async () => {
    const result = await handler(buildEvent());

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ status: 'ok' });
  });

  it('returns 404 for other methods on /health', async () => {
    const result = await handler(buildEvent({ httpMethod: 'POST' }));

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body)).toEqual({ message: 'Not found' });
  });
});
