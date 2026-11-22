import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createUploadUrlHandler } from './routes/create-upload-url';
import { getEntryHandler } from './routes/get-entry';
import { getImportHandler } from './routes/get-import';
import { healthHandler } from './routes/health';
import { listEntriesHandler } from './routes/list-entries';
import { listEntryVersionsHandler } from './routes/list-entry-versions';
import { listImportsHandler } from './routes/list-imports';
import { meHandler, usersHandler } from './routes/user-endpoints';

export type RouteHandler = (
  event: APIGatewayProxyEvent,
) => Promise<APIGatewayProxyResult>;

export const routes: Record<string, RouteHandler> = {
  'GET /health': healthHandler,
  'POST /imports/upload-url/{kind}': createUploadUrlHandler,
  'GET /imports': listImportsHandler,
  'GET /imports/{id}': getImportHandler,
  'GET /entries': listEntriesHandler,
  'GET /entries/{date}': getEntryHandler,
  'GET /entries/{date}/versions': listEntryVersionsHandler,
  'GET /me': meHandler,
  'GET /users': usersHandler,
};
