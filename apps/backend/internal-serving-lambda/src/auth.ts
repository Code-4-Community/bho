import type { APIGatewayProxyEvent } from 'aws-lambda';
import { AuthError, createVerifier } from '@bho/lambda-auth';
import { getDb } from './db';
import { HttpError } from './response';

export type UserRole = 'ADMIN' | 'STANDARD';

export interface CurrentUser {
  id: number;
  email: string;
  role: UserRole;
}

type VerifyToken = ReturnType<typeof createVerifier>;

let verifyToken: VerifyToken | undefined;

// Reused across warm invocations so signing keys stay cached.
const getVerifier = (): VerifyToken => {
  if (!verifyToken) {
    const { COGNITO_REGION, COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID } =
      process.env;
    if (!COGNITO_REGION || !COGNITO_USER_POOL_ID || !COGNITO_CLIENT_ID) {
      throw new Error(
        'COGNITO_REGION, COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID must be set',
      );
    }
    verifyToken = createVerifier({
      region: COGNITO_REGION,
      userPoolId: COGNITO_USER_POOL_ID,
      clientId: COGNITO_CLIENT_ID,
    });
  }
  return verifyToken;
};

// `Authorization: Bearer <token>`
const getBearerToken = (event: APIGatewayProxyEvent): string | null => {
  const header = Object.entries(event.headers ?? {}).find(
    ([name]) => name.toLowerCase() === 'authorization',
  )?.[1];
  const match = header?.match(/^Bearer\s+(\S+)$/i);
  return match ? match[1] : null;
};

// Null for a missing or invalid token, or a valid token with no matching
// users row (401); other errors throw (500).
export const getCurrentUser = async (
  event: APIGatewayProxyEvent,
): Promise<CurrentUser | null> => {
  const token = getBearerToken(event);
  if (!token) return null;

  let sub: string;
  try {
    sub = (await getVerifier()(token)).sub;
  } catch (err) {
    if (err instanceof AuthError) return null;
    throw err;
  }

  // get user id, email, and status (role) from database
  const user = await getDb()
    .selectFrom('users')
    .select(['id', 'email', 'status'])
    .where('cognitoSub', '=', sub)
    .executeTakeFirst();
  if (!user) return null;

  // users.status holds the role (ADMIN or STANDARD); see docs/database-schema.md.
  return { id: user.id, email: user.email, role: user.status as UserRole };
};

// The signed-in user, or a 401 (through handler.ts) when there isn't one.
export const requireUser = async (
  event: APIGatewayProxyEvent,
): Promise<CurrentUser> => {
  const user = await getCurrentUser(event);
  if (!user) throw new HttpError(401, 'Unauthorized');
  return user;
};

// The signed-in user if they have `role`: 401 when signed out, 403 otherwise.
export const requireRole = async (
  event: APIGatewayProxyEvent,
  role: UserRole,
): Promise<CurrentUser> => {
  const user = await requireUser(event);
  if (user.role !== role) throw new HttpError(403, 'Forbidden');
  return user;
};

// Test-only
export const resetVerifier = (): void => {
  verifyToken = undefined;
};
