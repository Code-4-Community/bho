import { Button, Menu, Portal } from '@chakra-ui/react';
import {
  ChevronDown,
  CircleAlert,
  CircleCheck,
  type LucideIcon,
  TriangleAlert,
} from 'lucide-react';
import type { ErrorLogEntry, PipelineSource } from '@api/types';
import { formatMonthDayET, formatTimeET } from '@utils/date';
import { type Column, DataTable } from '../DataTable';

export type ErrorLogSource = PipelineSource | 'all';
export type ErrorLogRange = '24h' | 'month';

const SOURCES: [ErrorLogSource, string][] = [
  ['all', 'All'],
  ['WeatherLink', 'WeatherLink'],
  ['APRSWxNet', 'APRSWxNet'],
  ['Weather Underground', 'Weather Underground'],
];

const RANGES: [ErrorLogRange, string][] = [
  ['24h', 'Last 24hr'],
  ['month', 'Last month'],
];

const OUTCOMES: Record<
  ErrorLogEntry['outcome'],
  { Icon: LucideIcon; tone: string; label: string }
> = {
  succeeded: { Icon: CircleCheck, tone: 'success', label: 'Succeeded' },
  retrying: { Icon: CircleAlert, tone: 'warning', label: 'Retrying' },
  failed: { Icon: TriangleAlert, tone: 'danger', label: 'Failed' },
};

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
    cell: (e) => {
      const { Icon, tone, label } = OUTCOMES[e.outcome];
      return (
        <Icon
          role="img"
          aria-label={label}
          color={`var(--color-${tone})`}
          fill={`var(--color-${tone}-bg)`}
          style={{ verticalAlign: 'middle' }}
        />
      );
    },
    center: true,
  },
];

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
          <ChevronDown />
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
