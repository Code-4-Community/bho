import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { liveConditionsHandler } from './routes/live-conditions';

export type RouteHandler = (
  event: APIGatewayProxyEvent,
) => Promise<APIGatewayProxyResult>;

export const routes: Record<string, RouteHandler> = {
  'GET /live-conditions': liveConditionsHandler,
};
