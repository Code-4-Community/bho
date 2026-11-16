import { generateKeyPairSync } from 'crypto';
import * as jwt from 'jsonwebtoken';

export const REGION = 'us-east-2';
export const USER_POOL_ID = 'us-east-2_TESTPOOL1';
export const CLIENT_ID = 'test-client-id';
export const ISSUER = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`;
export const KID = 'test-key-1';

function newKeyPair() {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { publicKey, privateKey };
}

const signing = newKeyPair();
const other = newKeyPair();

export const PUBLIC_KEY = signing.publicKey;

export async function getSigningKey(kid: string): Promise<string> {
  if (kid !== KID) throw new Error(`unknown kid ${kid}`);
  return PUBLIC_KEY;
}

type Claims = Record<string, unknown>;

function baseClaims(): Claims {
  return {
    sub: 'user-123',
    iss: ISSUER,
    token_use: 'access',
    client_id: CLIENT_ID,
    username: 'jane',
    'cognito:groups': ['admin'],
  };
}

interface MintOptions {
  claims?: Claims;
  privateKey?: string;
  kid?: string | null;
  expiresIn?: jwt.SignOptions['expiresIn'];
}

function mint({
  claims = {},
  privateKey = signing.privateKey,
  kid = KID,
  expiresIn = '1h',
}: MintOptions = {}): string {
  return jwt.sign({ ...baseClaims(), ...claims }, privateKey, {
    algorithm: 'RS256',
    expiresIn,
    ...(kid === null ? {} : { keyid: kid }),
  });
}

export const validAccessToken = () => mint();

export const validIdToken = () =>
  mint({
    claims: {
      token_use: 'id',
      aud: CLIENT_ID,
      client_id: undefined,
      email: 'jane@example.com',
    },
  });

export const expiredToken = () => mint({ expiresIn: -60 });

export const wrongSignatureToken = () => mint({ privateKey: other.privateKey });

export const wrongIssuerToken = () =>
  mint({ claims: { iss: 'https://evil.example.com/pool' } });

export const wrongClientToken = () => mint({ claims: { client_id: 'other' } });

export const wrongTokenUseToken = () => mint({ claims: { token_use: 'id' } });

export const unknownKidToken = () => mint({ kid: 'not-a-real-kid' });

export const noKidToken = () => mint({ kid: null });

export function algNoneToken(): string {
  const b64 = (o: object) =>
    Buffer.from(JSON.stringify(o)).toString('base64url');
  const header = b64({ alg: 'none', typ: 'JWT', kid: KID });
  const payload = b64({
    ...baseClaims(),
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
  return `${header}.${payload}.`;
}

export const malformedTokens: Record<string, string> = {
  empty: '',
  'not a jwt': 'not-a-jwt',
  'two segments': 'aaa.bbb',
  'garbage segments': '!!!.@@@.###',
  'valid shape, non-JSON header': 'aaaa.bbbb.cccc',
};
