// Parse and format dates as UTC so they never shift with the user's clock,
// and never call new Date(str) on them directly.

export const parseDate = (date: string) => new Date(`${date}T00:00:00Z`);

export const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parseDate(date));

export const todayET = (now: Date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(
    now,
  );
