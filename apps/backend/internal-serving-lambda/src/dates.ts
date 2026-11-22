const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

// undefined unless value is a real calendar date, e.g. rejects 2026-02-30
export const parseDate = (value: string | undefined) => {
  if (value === undefined || !DATE.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value)
    ? value
    : undefined;
};

export const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);

// Whole days from `from` to `to`, inclusive
export const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS) + 1;
