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

export const formatDay = (date: string) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(parseDate(date));

export const formatMonthDayET = (timestamp: string) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
  }).format(new Date(timestamp));

export const formatTimeET = (timestamp: string, seconds = false) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
    second: seconds ? '2-digit' : undefined,
  }).format(new Date(timestamp));

export const todayET = (now: Date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(
    now,
  );
