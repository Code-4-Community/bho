import { Box, Text } from '@chakra-ui/react';
import type { EntryListItem } from '@api/types';
import { formatDay, formatMonthDayET, formatTimeET } from '@utils/date';
import { type Column, DataTable } from '../DataTable';

const TONES: Record<EntryListItem['status'], string> = {
  Submitted: 'success',
  Flagged: 'warning',
  Corrected: 'info',
  Missing: 'danger',
};

function StatusTag({ status, correctedCount }: EntryListItem) {
  const tone = TONES[status];
  return (
    <Box
      as="span"
      display="inline-block"
      px="10px"
      py="2px"
      border="1px solid"
      borderColor={`var(--color-${tone})`}
      borderRadius="var(--radius-pill)"
      bg={`var(--color-${tone}-bg)`}
      color={`var(--color-${tone})`}
      fontSize="0.875rem"
      fontWeight="bold"
    >
      {status}
      {correctedCount ? ` (${correctedCount})` : ''}
    </Box>
  );
}

const columns: Column<EntryListItem>[] = [
  { header: 'Date', cell: (e) => <b>{formatDay(e.date)}</b> },
  { header: 'Status', cell: (e) => <StatusTag {...e} /> },
  { header: 'Last uploaded by', cell: (e) => <b>{e.lastUploadedBy ?? '—'}</b> },
  {
    header: 'Last modified',
    cell: (e) => (
      <b>
        {e.lastModifiedAt
          ? `${formatMonthDayET(e.lastModifiedAt)}, ${formatTimeET(
              e.lastModifiedAt,
            )}`
          : '—'}
      </b>
    ),
  },
  {
    header: 'File',
    cell: (e) =>
      e.fileName ? (
        <Text as="span" textDecoration="underline">
          {e.fileName}
        </Text>
      ) : (
        '—'
      ),
  },
];

interface SubmittedEntriesTableProps {
  entries: EntryListItem[];
  loading?: boolean;
  onRowClick: (date: string) => void;
  onClearFilters: () => void;
}

export function SubmittedEntriesTable({
  entries,
  loading,
  onRowClick,
  onClearFilters,
}: SubmittedEntriesTableProps) {
  return (
    <DataTable
      title="Submitted entries"
      columns={columns}
      rows={entries}
      rowKey={(e) => e.date}
      loading={loading}
      onRowClick={(e) => onRowClick(e.date)}
      onClearFilters={onClearFilters}
    />
  );
}
