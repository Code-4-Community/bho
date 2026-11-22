import type { APIGatewayProxyEvent } from 'aws-lambda';
import { AuthError, createVerifier } from '@bho/lambda-auth';
import {
  getCurrentUser,
  requireRole,
  requireUser,
  resetVerifier,
} from '../auth';
import { getDb } from '../db';
import { HttpError } from '../response';

// Only tests how auth.ts uses lambda-auth
jest.mock('@bho/lambda-auth', () => ({
  ...jest.requireActual('@bho/lambda-auth'),
  createVerifier: jest.fn(),
}));
jest.mock('../db');

const ENV = {
  COGNITO_REGION: 'us-east-2',
  COGNITO_USER_POOL_ID: 'us-east-2_TESTPOOL1',
  COGNITO_CLIENT_ID: 'test-client-id',
};

const ROW = { id: 7, email: 'dev@example.com', status: 'ADMIN' };
const USER = { id: 7, email: 'dev@example.com', role: 'ADMIN' };

const buildEvent = (headers: Record<string, string> = {}) =>
  ({ headers } as unknown as APIGatewayProxyEvent);

const originalEnv = process.env;
const verifyToken = jest.fn();
// Stands in for getDb().selectFrom(...).select(...).where(...).executeTakeFirst()
const executeTakeFirst = jest.fn();
const query = { select: jest.fn(), where: jest.fn(), executeTakeFirst };
const db = { selectFrom: jest.fn() };

beforeEach(() => {
  process.env = { ...originalEnv, ...ENV };
  resetVerifier();
  verifyToken.mockResolvedValue({ sub: 'user-123' });
  jest.mocked(createVerifier).mockReturnValue(verifyToken);
  // Set here because afterEach's resetAllMocks clears implementations
  db.selectFrom.mockReturnValue(query);
  query.select.mockReturnValue(query);
  query.where.mockReturnValue(query);
  executeTakeFirst.mockResolvedValue(ROW);
  jest.mocked(getDb).mockReturnValue(db as never);
});

afterEach(() => {
  process.env = originalEnv;
  jest.resetAllMocks();
});

const SIGNED_IN = buildEvent({ Authorization: 'Bearer good-token' });

describe('getCurrentUser', () => {
  it('returns the user for a valid bearer token', async () => {
    const user = await getCurrentUser(
      buildEvent({ Authorization: 'Bearer good-token' }),
    );

    expect(user).toEqual(USER);
    expect(verifyToken).toHaveBeenCalledWith('good-token');
  });

  it('looks the user up by Cognito sub', async () => {
    await getCurrentUser(buildEvent({ Authorization: 'Bearer good-token' }));

    expect(db.selectFrom).toHaveBeenCalledWith('users');
    expect(query.where).toHaveBeenCalledWith('cognitoSub', '=', 'user-123');
  });

  it('returns null when no user has that sub', async () => {
    executeTakeFirst.mockResolvedValue(undefined);

    const user = await getCurrentUser(
      buildEvent({ Authorization: 'Bearer good-token' }),
    );

    expect(user).toBeNull();
  });

  it('throws database errors', async () => {
    executeTakeFirst.mockRejectedValue(new Error('connection refused'));

    await expect(
      getCurrentUser(buildEvent({ Authorization: 'Bearer good-token' })),
    ).rejects.toThrow('connection refused');
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

    expect(user).toEqual(USER);
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
    expect(getDb).not.toHaveBeenCalled();
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

describe('requireUser', () => {
  it('returns the signed-in user', async () => {
    expect(await requireUser(SIGNED_IN)).toEqual(USER);
  });

  it('throws a 401 without a token', async () => {
    await expect(requireUser(buildEvent())).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('throws a 401 when no user has that sub', async () => {
    executeTakeFirst.mockResolvedValue(undefined);

    const err = await requireUser(SIGNED_IN).catch((e) => e);

    expect(err).toBeInstanceOf(HttpError);
    expect(err.statusCode).toBe(401);
  });
});

describe('requireRole', () => {
  it('returns the user when they have the role', async () => {
    expect(await requireRole(SIGNED_IN, 'ADMIN')).toEqual(USER);
  });

  it('throws a 403 when they have a different role', async () => {
    executeTakeFirst.mockResolvedValue({ ...ROW, status: 'STANDARD' });

    await expect(requireRole(SIGNED_IN, 'ADMIN')).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('throws a 401 when signed out', async () => {
    await expect(requireRole(buildEvent(), 'ADMIN')).rejects.toMatchObject({
      statusCode: 401,
    });
  });
});
