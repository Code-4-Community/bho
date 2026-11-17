import type { APIGatewayProxyEvent } from 'aws-lambda';
import { AuthError, createVerifier } from '@bho/lambda-auth';
import { getCurrentUser, resetVerifier } from '../auth';

// Only tests how auth.ts uses lambda-auth
jest.mock('@bho/lambda-auth', () => ({
  ...jest.requireActual('@bho/lambda-auth'),
  createVerifier: jest.fn(),
}));

const ENV = {
  COGNITO_REGION: 'us-east-2',
  COGNITO_USER_POOL_ID: 'us-east-2_TESTPOOL1',
  COGNITO_CLIENT_ID: 'test-client-id',
};

const buildEvent = (headers: Record<string, string> = {}) =>
  ({ headers } as unknown as APIGatewayProxyEvent);

describe('getCurrentUser', () => {
  const originalEnv = process.env;
  const verifyToken = jest.fn();

  beforeEach(() => {
    process.env = { ...originalEnv, ...ENV };
    resetVerifier();
    verifyToken.mockResolvedValue({ sub: 'user-123' });
    jest.mocked(createVerifier).mockReturnValue(verifyToken);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.resetAllMocks();
  });

  it('returns the user for a valid bearer token', async () => {
    const user = await getCurrentUser(
      buildEvent({ Authorization: 'Bearer good-token' }),
    );

    expect(user).toEqual({ id: 'user-123' });
    expect(verifyToken).toHaveBeenCalledWith('good-token');
  });

  it('configures the verifier from env vars', async () => {
    await getCurrentUser(buildEvent({ Authorization: 'Bearer good-token' }));

    expect(createVerifier).toHaveBeenCalledWith({
      region: 'us-east-2',
      userPoolId: 'us-east-2_TESTPOOL1',
      clientId: 'test-client-id',
    });
  });

  it('reuses the verifier across calls', async () => {
    const event = buildEvent({ Authorization: 'Bearer good-token' });

    await getCurrentUser(event);
    await getCurrentUser(event);

    expect(createVerifier).toHaveBeenCalledTimes(1);
  });

  it('reads the header case-insensitively', async () => {
    const user = await getCurrentUser(
      buildEvent({ authorization: 'bearer good-token' }),
    );

    expect(user).toEqual({ id: 'user-123' });
  });

  it.each([
    ['no Authorization header', {}],
    ['a non-bearer scheme', { Authorization: 'Basic dXNlcjpwYXNz' }],
    ['an empty bearer token', { Authorization: 'Bearer ' }],
  ])('returns null for %s', async (_name, headers) => {
    const user = await getCurrentUser(buildEvent(headers));

    expect(user).toBeNull();
    expect(verifyToken).not.toHaveBeenCalled();
  });

  it('returns null when headers is null', async () => {
    const event = { headers: null } as unknown as APIGatewayProxyEvent;

    expect(await getCurrentUser(event)).toBeNull();
  });

  it('returns null when the token is rejected', async () => {
    verifyToken.mockRejectedValue(
      new AuthError('EXPIRED', 'Token has expired'),
    );

    const user = await getCurrentUser(
      buildEvent({ Authorization: 'Bearer expired-token' }),
    );

    expect(user).toBeNull();
  });

  it('throws unexpected verifier errors', async () => {
    verifyToken.mockRejectedValue(new Error('socket hang up'));

    await expect(
      getCurrentUser(buildEvent({ Authorization: 'Bearer good-token' })),
    ).rejects.toThrow('socket hang up');
  });

  it('throws when the Cognito env vars are missing', async () => {
    delete process.env.COGNITO_USER_POOL_ID;

    await expect(
      getCurrentUser(buildEvent({ Authorization: 'Bearer good-token' })),
    ).rejects.toThrow('COGNITO_USER_POOL_ID');
  });
});
