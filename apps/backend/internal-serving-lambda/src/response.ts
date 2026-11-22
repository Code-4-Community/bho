import type { APIGatewayProxyResult } from 'aws-lambda';

export const response = (
  statusCode: number,
  body: unknown,
): APIGatewayProxyResult => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

// Thrown from a route to end the request with this status
// handler.ts turns it into a response. Any other error is a 500.
export class HttpError extends Error {
  constructor(readonly statusCode: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}
