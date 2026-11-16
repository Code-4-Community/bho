import type { APIGatewayProxyEvent } from 'aws-lambda';

export interface CurrentUser {
  // Cognito `sub` claim
  id: string;
}

// Placeholder: always returns null (401).
// The real version verifies the bearer token with @bho/lambda-auth.
export const getCurrentUser = async (
  _event: APIGatewayProxyEvent,
): Promise<CurrentUser | null> => null;
