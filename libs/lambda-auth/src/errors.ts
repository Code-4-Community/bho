export type AuthErrorCode =
  | 'MALFORMED_TOKEN'
  | 'EXPIRED'
  | 'INVALID_SIGNATURE'
  | 'INVALID_CLAIMS'
  | 'KEY_NOT_FOUND';

export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}
