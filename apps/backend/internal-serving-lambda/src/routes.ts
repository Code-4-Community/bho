import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { healthHandler } from './routes/health';
import { createUploadUrlHandler } from './routes/create-upload-url';

export type RouteHandler = (
  event: APIGatewayProxyEvent,
) => Promise<APIGatewayProxyResult>;

export const routes: Record<string, RouteHandler> = {
  'GET /health': healthHandler,
  'POST /imports/{kind}': createUploadUrlHandler,
};
