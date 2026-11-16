import { AuthError, AuthErrorCode } from './errors';
import { createVerifier } from './verify';
import {
  CLIENT_ID,
  ISSUER,
  REGION,
  USER_POOL_ID,
  algNoneToken,
  expiredToken,
  getSigningKey,
  malformedTokens,
  noKidToken,
  unknownKidToken,
  validAccessToken,
  validIdToken,
  wrongClientToken,
  wrongIssuerToken,
  wrongSignatureToken,
  wrongTokenUseToken,
} from './__fixtures__/tokens';

const config = {
  region: REGION,
  userPoolId: USER_POOL_ID,
  clientId: CLIENT_ID,
  getSigningKey,
};

async function codeOf(promise: Promise<unknown>): Promise<AuthErrorCode> {
  try {
    await promise;
  } catch (err) {
    if (err instanceof AuthError) return err.code;
    throw err;
  }
  throw new Error('expected verification to reject');
}

describe('verifyToken', () => {
  const verifyAccess = createVerifier(config);

  it('returns the decoded claims for a valid access token', async () => {
    const claims = await verifyAccess(validAccessToken());
    expect(claims).toMatchObject({
      sub: 'user-123',
      iss: ISSUER,
      token_use: 'access',
      client_id: CLIENT_ID,
      'cognito:groups': ['admin'],
    });
    expect(claims.exp).toBeGreaterThan(claims.iat);
  });

  it('accepts a valid id token when configured for id tokens', async () => {
    const verifyId = createVerifier({ ...config, tokenUse: 'id' });
    const claims = await verifyId(validIdToken());
    expect(claims).toMatchObject({
      token_use: 'id',
      aud: CLIENT_ID,
      email: 'jane@example.com',
    });
  });

  it('rejects an expired token', async () => {
    expect(await codeOf(verifyAccess(expiredToken()))).toBe('EXPIRED');
  });

  it.each(Object.entries(malformedTokens))(
    'rejects a malformed token (%s)',
    async (_name, token) => {
      expect(await codeOf(verifyAccess(token))).toBe('MALFORMED_TOKEN');
    },
  );

  it('rejects a non-string token', async () => {
    const code = await codeOf(verifyAccess(undefined as unknown as string));
    expect(code).toBe('MALFORMED_TOKEN');
  });

  it('rejects a token without a kid', async () => {
    expect(await codeOf(verifyAccess(noKidToken()))).toBe('MALFORMED_TOKEN');
  });

  it('rejects a token signed by a different key', async () => {
    expect(await codeOf(verifyAccess(wrongSignatureToken()))).toBe(
      'INVALID_SIGNATURE',
    );
  });

  it('rejects an unsigned alg:none token', async () => {
    expect(await codeOf(verifyAccess(algNoneToken()))).toBe(
      'INVALID_SIGNATURE',
    );
  });

  it('rejects a token whose kid is not in the key set', async () => {
    expect(await codeOf(verifyAccess(unknownKidToken()))).toBe('KEY_NOT_FOUND');
  });

  it('rejects a token from the wrong issuer', async () => {
    expect(await codeOf(verifyAccess(wrongIssuerToken()))).toBe(
      'INVALID_CLAIMS',
    );
  });

  it('rejects a token for a different app client', async () => {
    expect(await codeOf(verifyAccess(wrongClientToken()))).toBe(
      'INVALID_CLAIMS',
    );
  });

  it('rejects the wrong token_use', async () => {
    expect(await codeOf(verifyAccess(wrongTokenUseToken()))).toBe(
      'INVALID_CLAIMS',
    );
  });
});
