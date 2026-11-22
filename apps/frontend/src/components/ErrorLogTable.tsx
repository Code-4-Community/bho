import { Button, Menu, Portal } from '@chakra-ui/react';
import type { ErrorLogEntry, PipelineSource } from '@api/types';
import { formatMonthDayET, formatTimeET } from '@utils/date';
import { type Column, DataTable } from './DataTable';

export type ErrorLogSource = PipelineSource | 'all';
export type ErrorLogRange = '24h' | 'month';

const SOURCES: [ErrorLogSource, string][] = [
  ['all', 'All'],
  ['WeatherLink', 'WeatherLink'],
  ['APRSWxNet', 'APRSWxNet'],
  ['Weather Underground', 'Weather Underground'],
];

// Figma only shows these two.
const RANGES: [ErrorLogRange, string][] = [
  ['24h', 'Last 24hr'],
  ['month', 'Last month'],
];

// Outcome icons are from the Figma error log.
const TRIANGLE =
  'M1.20819 20.2799C1.12659 19.4173 1.67139 18.3666 2.76339 16.2666L8.58459 5.06393L8.58731 5.05871C9.6763 2.96486 10.222 1.91564 10.933 1.56393C11.2403 1.41193 11.5728 1.33337 11.9092 1.33337C12.2455 1.33337 12.5781 1.41193 12.8854 1.56393C13.5981 1.91587 14.144 2.96624 15.2344 5.06417L15.235 5.06527L21.055 16.2653C22.147 18.3666 22.6918 19.4173 22.6102 20.2786C22.575 20.6503 22.4698 21.0097 22.3015 21.3333C22.1332 21.6569 21.9056 21.9377 21.6334 22.1573C21.0034 22.6666 19.9126 22.6666 17.7322 22.6666H6.08859C3.90579 22.6666 2.81499 22.6666 2.18379 22.1573C1.91193 21.9377 1.68461 21.6571 1.51655 21.3337C1.34849 21.0103 1.24344 20.6513 1.20819 20.2799Z';

const OUTCOMES: Record<
  ErrorLogEntry['outcome'],
  { tone: string; label: string; glyph: string; shape?: string }
> = {
  succeeded: {
    tone: 'success',
    label: 'Succeeded',
    glyph: 'm8.8 12 2.13 2.13 4.27-4.26',
  },
  retrying: {
    tone: 'warning',
    label: 'Retrying',
    glyph: 'M12 7.73V12m0 4.27h.01',
  },
  failed: {
    tone: 'danger',
    label: 'Failed',
    glyph: 'M11.91 8v5.33m0 4.07h.01',
    shape: TRIANGLE,
  },
};

function OutcomeIcon({ outcome }: { outcome: ErrorLogEntry['outcome'] }) {
  const { tone, label, glyph, shape } = OUTCOMES[outcome];
  return (
    <svg
      role="img"
      aria-label={label}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      strokeWidth="2.13"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        fill: `var(--color-${tone}-bg)`,
        stroke: `var(--color-${tone})`,
        verticalAlign: 'middle',
      }}
    >
      {shape ? <path d={shape} /> : <circle cx="12" cy="12" r="10.67" />}
      <path d={glyph} fill="none" />
    </svg>
  );
}

const columns: Column<ErrorLogEntry>[] = [
  {
    header: 'Timestamp',
    cell: (e) => (
      <>
        <b>{formatMonthDayET(e.occurredAt)} •</b>{' '}
        {formatTimeET(e.occurredAt, true)}
      </>
    ),
  },
  { header: 'Source', cell: (e) => <b>{e.source}</b> },
  { header: 'Description', cell: (e) => e.description },
  { header: 'Retry #', cell: (e) => e.retryCount, center: true },
  {
    header: 'Outcome',
    cell: (e) => <OutcomeIcon outcome={e.outcome} />,
    center: true,
  },
];

// Stand-in until the shared Filter from #94 lands.
function FilterMenu<V extends string>({
  prefix = '',
  value,
  options,
  onChange,
}: {
  prefix?: string;
  value: V;
  options: [V, string][];
  onChange: (value: V) => void;
}) {
  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button
          bg="var(--color-primary)"
          color="var(--color-text-inverse)"
          _hover={{ opacity: 0.9 }}
        >
          {prefix}
          {options.find(([v]) => v === value)?.[1]}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content>
            <Menu.RadioItemGroup
              value={value}
              onValueChange={(details) => onChange(details.value as V)}
            >
              {options.map(([v, label]) => (
                <Menu.RadioItem key={v} value={v}>
                  {label}
                  <Menu.ItemIndicator />
                </Menu.RadioItem>
              ))}
            </Menu.RadioItemGroup>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}

interface ErrorLogTableProps {
  entries: ErrorLogEntry[];
  loading?: boolean;
  source: ErrorLogSource;
  range: ErrorLogRange;
  onSourceChange: (source: ErrorLogSource) => void;
  onRangeChange: (range: ErrorLogRange) => void;
  onClearFilters: () => void;
}

export function ErrorLogTable({
  entries,
  loading,
  source,
  range,
  onSourceChange,
  onRangeChange,
  onClearFilters,
}: ErrorLogTableProps) {
  return (
    <DataTable
      title="Error log"
      actions={
        <>
          <FilterMenu
            prefix="Source: "
            value={source}
            options={SOURCES}
            onChange={onSourceChange}
          />
          <FilterMenu value={range} options={RANGES} onChange={onRangeChange} />
        </>
      }
      columns={columns}
      rows={entries}
      rowKey={(e) => e.id}
      loading={loading}
      onClearFilters={onClearFilters}
    />
  );
}
