import {
  fetchWeatherlinkData,
  normalizeWeatherlinkData,
} from '@bho/davis-client';

export type ProviderState = 'healthy' | 'degraded' | 'down' | 'not_integrated';

export interface ProviderStatus {
  name: string;
  state: ProviderState;
  // The station's last reading (ISO 8601 UTC). null if the check failed or
  // the response had no reading time.
  lastUpdatedAt: string | null;
}

export interface PipelineStatus {
  active: string | null;
  checkedAt: string;
  providers: ProviderStatus[];
}

// The dashboard waits on this route, so a source that takes longer is down
export const CHECK_TIMEOUT_MS = 3000;
// How old the last reading can be for each state. See the README.
export const HEALTHY_MAX_AGE_MS = 15 * 60 * 1000;
export const DEGRADED_MAX_AGE_MS = 60 * 60 * 1000;

export interface Provider {
  name: string;
  // Resolves to the time of the station's last reading (epoch ms), or null if
  // the response doesn't have one. Rejects if the source can't be read.
  // Not set for sources that aren't integrated yet.
  lastReadingAt?: () => Promise<number | null>;
}

const weatherLinkLastReadingAt = async () => {
  const { observedAt } = normalizeWeatherlinkData(await fetchWeatherlinkData());
  return typeof observedAt === 'number' ? observedAt : null;
};

// In priority order: the first source that is up is the active one
export const PROVIDERS: Provider[] = [
  { name: 'WeatherLink', lastReadingAt: weatherLinkLastReadingAt },
  { name: 'APRSWxNet' },
  { name: 'Weather Underground' },
];

export const stateForReading = (
  lastReadingAt: number | null,
  now: number,
): ProviderState => {
  if (lastReadingAt === null) return 'degraded';
  const age = now - lastReadingAt;
  if (age <= HEALTHY_MAX_AGE_MS) return 'healthy';
  if (age <= DEGRADED_MAX_AGE_MS) return 'degraded';
  return 'down';
};

const withTimeout = <T>(promise: Promise<T>, ms: number) =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out after ${ms} ms`)),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });

const checkProvider = async (
  { name, lastReadingAt }: Provider,
  now: number,
): Promise<ProviderStatus> => {
  if (!lastReadingAt) {
    return { name, state: 'not_integrated', lastUpdatedAt: null };
  }
  try {
    const readingAt = await withTimeout(lastReadingAt(), CHECK_TIMEOUT_MS);
    return {
      name,
      state: stateForReading(readingAt, now),
      lastUpdatedAt:
        readingAt === null ? null : new Date(readingAt).toISOString(),
    };
  } catch (err) {
    console.error(`${name} check failed`, err);
    return { name, state: 'down', lastUpdatedAt: null };
  }
};

export const getPipelineStatus = async (
  providers: Provider[] = PROVIDERS,
): Promise<PipelineStatus> => {
  const now = Date.now();
  const statuses = await Promise.all(
    providers.map((provider) => checkProvider(provider, now)),
  );
  const active = statuses.find(
    ({ state }) => state === 'healthy' || state === 'degraded',
  );

  return {
    active: active?.name ?? null,
    checkedAt: new Date(now).toISOString(),
    providers: statuses,
  };
};
