import type { APIGatewayProxyEvent } from 'aws-lambda';

export interface CurrentUser {
  // Cognito `sub` claim
  id: string;
}

// Placeholder: returns null (401) except in local dev.
// The real version verifies the bearer token with @bho/lambda-auth.
export const getCurrentUser = async (
  _event: APIGatewayProxyEvent,
): Promise<CurrentUser | null> => {
  // Local dev signs everyone in as DEV_USER_ID. The Lambda runtime always sets
  // AWS_LAMBDA_FUNCTION_NAME, so this can't take effect in AWS.
  const devUserId = process.env.DEV_USER_ID;
  if (devUserId && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return { id: devUserId };
  }
  return null;
};
