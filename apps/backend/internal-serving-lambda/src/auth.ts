import type { APIGatewayProxyEvent } from 'aws-lambda';
import { AuthError, createVerifier } from '@bho/lambda-auth';

export interface CurrentUser {
  // Cognito `sub` claim
  id: string;
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

// Null for a missing or invalid token (401); other errors throw (500).
export const getCurrentUser = async (
  event: APIGatewayProxyEvent,
): Promise<CurrentUser | null> => {
  const token = getBearerToken(event);
  if (!token) return null;

  try {
    const claims = await getVerifier()(token);
    return { id: claims.sub };
  } catch (err) {
    if (err instanceof AuthError) return null;
    throw err;
  }
};

// Test-only
export const resetVerifier = (): void => {
  verifyToken = undefined;
};
