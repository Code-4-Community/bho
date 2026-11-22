import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { routes } from './routes';
import { response } from './response';

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const key = `${event.httpMethod} ${event.resource}`;
  const route = routes[key];
  if (!route) return response(404, { message: 'Not found' });
  try {
    return await route(event);
  } catch (err) {
    console.error(err);
    return response(500, { message: 'Internal server error' });
  }
};
