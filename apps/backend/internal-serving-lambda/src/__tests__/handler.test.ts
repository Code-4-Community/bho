import type { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../handler';
import { HttpError } from '../response';
import { routes } from '../routes';

jest.mock('../routes', () => ({ routes: { 'GET /test': jest.fn() } }));

const event = {
  httpMethod: 'GET',
  resource: '/test',
} as APIGatewayProxyEvent;
const route = routes['GET /test'] as jest.Mock;

describe('handler errors', () => {
  afterEach(() => jest.resetAllMocks());

  it.each([
    [401, 'Unauthorized'],
    [403, 'Forbidden'],
  ])(
    'returns %i for an HttpError(%i)',
    async (statusCode: number, message: string) => {
      route.mockRejectedValue(new HttpError(statusCode, message));

      const result = await handler(event);

      expect(result.statusCode).toBe(statusCode);
      expect(JSON.parse(result.body)).toEqual({ message });
    },
  );

  it('returns 500 for any other error', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    route.mockRejectedValue(new Error('boom'));

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      message: 'Internal server error',
    });
  });
});
