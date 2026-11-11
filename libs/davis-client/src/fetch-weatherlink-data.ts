const WEATHERLINK_URL =
  'https://www.weatherlink.com/embeddablePage/summaryData/58237ce672554bc5b0009b67644756f3';

/**
 * Fetches the raw summary JSON from the Davis WeatherLink API and adds a
 * `fetchedAt` timestamp (Unix epoch, milliseconds).
 */
export async function fetchWeatherlinkData(
  url: string = WEATHERLINK_URL,
): Promise<Record<string, unknown>> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `WeatherLink request failed: ${res.status} ${res.statusText}`,
    );
  }
  const data = (await res.json()) as Record<string, unknown>;
  return { ...data, fetchedAt: Date.now() };
}
