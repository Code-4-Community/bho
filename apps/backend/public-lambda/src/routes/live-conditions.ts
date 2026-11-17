import type { RouteHandler } from '../routes';
import { response } from '../response';
import {
  fetchWeatherlinkData,
  normalizeWeatherlinkData,
} from '@bho/davis-client';

export const liveConditionsHandler: RouteHandler = async () => {
  try {
    const rawData = await fetchWeatherlinkData();
    return response(200, normalizeWeatherlinkData(rawData));
  } catch (err) {
    console.error('Failed to fetch live conditions', err);
    return response(502, { message: 'Unable to fetch live conditions' });
  }
};
