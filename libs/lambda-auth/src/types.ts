export type TokenUse = 'id' | 'access';

export interface CognitoClaims {
  sub: string;
  iss: string;
  token_use: TokenUse;
  exp: number;
  iat: number;
  aud?: string;
  client_id?: string;
  'cognito:username'?: string;
  'cognito:groups'?: string[];
  email?: string;
  [claim: string]: unknown;
}

export interface VerifierConfig {
  region: string;
  userPoolId: string;
  clientId: string;
  tokenUse?: TokenUse;
  getSigningKey?: (kid: string) => Promise<string>;
}
