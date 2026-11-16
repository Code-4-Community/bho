import * as jwt from 'jsonwebtoken';
import { AuthError } from './errors';
import { CognitoClaims, VerifierConfig } from './types';

export function issuerFor(region: string, userPoolId: string): string {
  return `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
}

function jwksSigningKey(issuer: string): (kid: string) => Promise<string> {
  let client: import('jwks-rsa').JwksClient | undefined;
  return async (kid) => {
    if (!client) {
      const { JwksClient } = await import('jwks-rsa');
      client = new JwksClient({
        jwksUri: `${issuer}/.well-known/jwks.json`,
        cache: true,
        rateLimit: true,
      });
    }
    return (await client.getSigningKey(kid)).getPublicKey();
  };
}

export function createVerifier(config: VerifierConfig) {
  const issuer = issuerFor(config.region, config.userPoolId);
  const tokenUse = config.tokenUse ?? 'access';
  const getSigningKey = config.getSigningKey ?? jwksSigningKey(issuer);

  return async function verifyToken(token: string): Promise<CognitoClaims> {
    const decoded =
      typeof token === 'string' ? jwt.decode(token, { complete: true }) : null;
    if (!decoded || typeof decoded.payload === 'string') {
      throw new AuthError('MALFORMED_TOKEN', 'Token is not a valid JWT');
    }
    const kid = decoded.header.kid;
    if (!kid) {
      throw new AuthError('MALFORMED_TOKEN', 'Token header has no kid');
    }

    let key: string;
    try {
      key = await getSigningKey(kid);
    } catch {
      throw new AuthError(
        'KEY_NOT_FOUND',
        `No signing key found for kid ${kid}`,
      );
    }

    let claims: CognitoClaims;
    try {
      claims = jwt.verify(token, key, {
        algorithms: ['RS256'],
        issuer,
      }) as CognitoClaims;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new AuthError('EXPIRED', 'Token has expired');
      }
      if (err instanceof jwt.NotBeforeError) {
        throw new AuthError('INVALID_CLAIMS', 'Token is not yet valid');
      }
      if (err instanceof jwt.JsonWebTokenError) {
        if (err.message.startsWith('jwt issuer invalid')) {
          throw new AuthError('INVALID_CLAIMS', 'Token issuer is invalid');
        }
        throw new AuthError('INVALID_SIGNATURE', 'Token signature is invalid');
      }
      throw err;
    }

    if (claims.token_use !== tokenUse) {
      throw new AuthError('INVALID_CLAIMS', `Expected token_use ${tokenUse}`);
    }
    const tokenClient = tokenUse === 'id' ? claims.aud : claims.client_id;
    if (tokenClient !== config.clientId) {
      throw new AuthError('INVALID_CLAIMS', 'Token client does not match');
    }
    return claims;
  };
}
