import {
  Box,
  Button,
  Flex,
  Heading,
  Spinner,
  Table,
  Text,
} from '@chakra-ui/react';
import { ChevronRight, Search } from 'lucide-react';
import type { KeyboardEvent, ReactNode } from 'react';

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  center?: boolean;
}

interface DataTableProps<T> {
  title: string;
  actions?: ReactNode;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  loading?: boolean;
  onRowClick?: (row: T) => void;
  onClearFilters: () => void;
}

const tableCss = {
  '& th, & td': {
    px: 'var(--space-4)',
    borderColor: 'var(--color-border)',
    fontFamily: 'var(--font-body)',
    lineHeight: 'var(--line-height)',
  },
  '& th': {
    py: 'var(--space-3)',
    bg: 'var(--color-bg-table-header)',
    color: 'var(--color-text-inverse)',
    fontSize: 'var(--font-size-body-sm)',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  '& td': {
    py: 'var(--space-4)',
    color: 'var(--color-text)',
    fontSize: '1.25rem',
  },
  '& tbody tr:last-of-type td': { borderBottomWidth: 0 },
  '& tbody tr:focus-visible': {
    outline: '2px solid var(--color-primary)',
    outlineOffset: '-2px',
  },
};

export function DataTable<T>({
  title,
  actions,
  columns,
  rows,
  rowKey,
  loading = false,
  onRowClick,
  onClearFilters,
}: DataTableProps<T>) {
  const message = (content: ReactNode) => (
    <Table.Row>
      <Table.Cell colSpan={columns.length + (onRowClick ? 1 : 0)}>
        <Flex direction="column" align="center" gap="var(--space-5)" py="56px">
          {content}
        </Flex>
      </Table.Cell>
    </Table.Row>
  );

  let body: ReactNode;
  if (loading) {
    body = message(
      <Spinner
        size="lg"
        color="var(--color-primary)"
        role="status"
        aria-label="Loading"
      />,
    );
  } else if (rows.length === 0) {
    body = message(
      <>
        <Search size={46} strokeWidth={1.5} />
        <Text fontSize="var(--font-size-body-md)" fontWeight="bold">
          No entries match these filters.
        </Text>
        <Button
          onClick={onClearFilters}
          bg="var(--color-primary)"
          color="var(--color-text-inverse)"
          _hover={{ opacity: 0.9 }}
        >
          Clear Filters
        </Button>
      </>,
    );
  } else {
    body = rows.map((row) => (
      <Table.Row
        key={rowKey(row)}
        {...(onRowClick && {
          tabIndex: 0,
          cursor: 'pointer',
          onClick: () => onRowClick(row),
          onKeyDown: (e: KeyboardEvent) => {
            if (e.key === 'Enter') onRowClick(row);
          },
        })}
      >
        {columns.map((column) => (
          <Table.Cell
            key={column.header}
            textAlign={column.center ? 'center' : undefined}
          >
            {column.cell(row)}
          </Table.Cell>
        ))}
        {onRowClick && (
          <Table.Cell w="1%">
            <ChevronRight size={16} />
          </Table.Cell>
        )}
      </Table.Row>
    ));
  }

  return (
    <Box
      bg="var(--color-bg-card)"
      border="1px solid var(--color-border)"
      borderTopRadius="var(--radius-md)"
      overflow="hidden"
    >
      <Flex align="center" gap="var(--space-4)" minH="89px" px="var(--space-6)">
        <Heading as="h3" flex="1">
          {title}
        </Heading>
        {actions && <Flex gap="18px">{actions}</Flex>}
      </Flex>
      <Table.ScrollArea>
        <Table.Root interactive={!!onRowClick} css={tableCss}>
          <Table.Header>
            <Table.Row>
              {columns.map((column) => (
                <Table.ColumnHeader
                  key={column.header}
                  textAlign={column.center ? 'center' : undefined}
                >
                  {column.header}
                </Table.ColumnHeader>
              ))}
              {onRowClick && <Table.ColumnHeader />}
            </Table.Row>
          </Table.Header>
          <Table.Body>{body}</Table.Body>
        </Table.Root>
      </Table.ScrollArea>
    </Box>
  );
}
