import type { APIGatewayProxyEvent } from 'aws-lambda';
import { getCurrentUser } from '../auth';

const event = {} as APIGatewayProxyEvent;

describe('getCurrentUser', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env, DEV_USER_ID: '2' };
    delete process.env.AWS_LAMBDA_FUNCTION_NAME;
  });

  afterEach(() => {
    process.env = env;
  });

  it('signs in as DEV_USER_ID locally', async () => {
    expect(await getCurrentUser(event)).toEqual({ id: '2' });
  });

  it('ignores DEV_USER_ID inside Lambda', async () => {
    process.env.AWS_LAMBDA_FUNCTION_NAME = 'internal-serving-lambda';

    expect(await getCurrentUser(event)).toBeNull();
  });
});
