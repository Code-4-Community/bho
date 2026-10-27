import type { RouteHandler } from '../routes';
import { response } from '../response';

export const healthHandler: RouteHandler = async () => {
  return response(200, { status: 'ok' });
};
