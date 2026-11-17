import type { RouteHandler } from '../routes';
import { response } from '../response';
import { getPipelineStatus } from '../pipeline-status';

// GET /pipeline-status
export const pipelineStatusHandler: RouteHandler = async () =>
  response(200, await getPipelineStatus());
