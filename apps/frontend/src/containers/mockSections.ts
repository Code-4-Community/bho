// Mock data for the /dev/components preview. Reusable when the real sections
// are built. Dates and times are pre-formatted strings.

export interface OpenItem {
  date: string;
  time: string;
  field: string;
  reason: string;
  kind: 'flagged' | 'scheduled';
}

export const openItems: OpenItem[] = [
  {
    date: 'Nov 1, 2026',
    time: '13:00 - 14:00',
    field: 'Peak Gust',
    reason: 'Out of Range: 112 mph',
    kind: 'flagged',
  },
  {
    date: 'Nov 1, 2026',
    time: '12:00 - 13:00',
    field: 'Station Pressure',
    reason: 'Out of Range: 31.9 in',
    kind: 'flagged',
  },
  {
    date: 'Oct 31, 2026',
    time: '09:00 - 10:00',
    field: 'Wind Direction',
    reason: 'Out of Range: 400 deg',
    kind: 'flagged',
  },
  {
    date: 'Oct 30, 2026',
    time: '15:00 - 16:00',
    field: 'Peak Gust',
    reason: 'Scheduled Value',
    kind: 'scheduled',
  },
  {
    date: 'Oct 29, 2026',
    time: '08:00 - 09:00',
    field: 'Temperature',
    reason: 'Out of Range: 140 F',
    kind: 'flagged',
  },
];

export interface Upload {
  date: string;
  time: string;
  uploader: string;
  file: string;
  entry: { label: string; tone: 'success' | 'warning' };
}

export const recentActivity: Upload[] = [
  {
    date: 'Nov 1, 2026',
    time: '13:00',
    uploader: 'John Doe',
    file: 'FileName.csv',
    entry: { label: "Today's Entry 11/1", tone: 'success' },
  },
  {
    date: 'Nov 1, 2026',
    time: '09:30',
    uploader: 'Jane Smith',
    file: 'Station_A.csv',
    entry: { label: "Today's Entry 11/1", tone: 'success' },
  },
  {
    date: 'Nov 1, 2026',
    time: '08:15',
    uploader: 'John Doe',
    file: 'Backfill.csv',
    entry: { label: 'Past Entry 10/31', tone: 'warning' },
  },
  {
    date: 'Oct 31, 2026',
    time: '17:45',
    uploader: 'Priya Patel',
    file: 'Evening.csv',
    entry: { label: 'Past Entry 10/31', tone: 'warning' },
  },
  {
    date: 'Oct 31, 2026',
    time: '12:00',
    uploader: 'Jane Smith',
    file: 'Midday.csv',
    entry: { label: 'Past Entry 10/31', tone: 'warning' },
  },
  {
    date: 'Oct 30, 2026',
    time: '16:20',
    uploader: 'John Doe',
    file: 'Afternoon.csv',
    entry: { label: 'Past Entry 10/30', tone: 'warning' },
  },
];

export interface EditLogEntry {
  date: string;
  time: string;
  uploader: string;
  file: string;
  status: 'current' | 'flagged';
}

/** Variant A: current version on top, highlighted. */
export const editLogA: EditLogEntry[] = [
  {
    date: 'Nov 1, 2026',
    time: '13:00',
    uploader: 'John Doe',
    file: 'FileName.csv',
    status: 'current',
  },
  {
    date: 'Nov 1, 2026',
    time: '09:30',
    uploader: 'Jane Smith',
    file: 'FileName_v1.csv',
    status: 'flagged',
  },
];

/** Variant B: flagged on top, current version highlighted below. */
export const editLogB: EditLogEntry[] = [
  {
    date: 'Nov 1, 2026',
    time: '14:10',
    uploader: 'Priya Patel',
    file: 'FileName_v3.csv',
    status: 'flagged',
  },
  {
    date: 'Nov 1, 2026',
    time: '13:00',
    uploader: 'John Doe',
    file: 'FileName.csv',
    status: 'current',
  },
];
