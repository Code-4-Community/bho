import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createUploadUrlHandler } from './routes/create-upload-url';
import { getImportHandler } from './routes/get-import';
import { healthHandler } from './routes/health';
import { listImportsHandler } from './routes/list-imports';

export type RouteHandler = (
  event: APIGatewayProxyEvent,
) => Promise<APIGatewayProxyResult>;

export const routes: Record<string, RouteHandler> = {
  'GET /health': healthHandler,
  'POST /imports/upload-url/{kind}': createUploadUrlHandler,
  'GET /imports': listImportsHandler,
  'GET /imports/{id}': getImportHandler,
};
