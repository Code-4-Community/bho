import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/render';
import { type Column, DataTable } from './DataTable';

interface Person {
  id: number;
  name: string;
}

const columns: Column<Person>[] = [{ header: 'Name', cell: (p) => p.name }];
const people = [
  { id: 1, name: 'Ada' },
  { id: 2, name: 'Grace' },
];

describe('DataTable', () => {
  it('shows the empty state, whose button clears the filters', async () => {
    const onClearFilters = vi.fn();
    renderWithProviders(
      <DataTable
        title="People"
        columns={columns}
        rows={[]}
        rowKey={(p) => p.id}
        onClearFilters={onClearFilters}
      />,
    );
    expect(screen.getByText('No entries match these filters.')).toBeTruthy();
    await userEvent.click(
      screen.getByRole('button', { name: 'Clear Filters' }),
    );
    expect(onClearFilters).toHaveBeenCalledOnce();
  });

  it('shows a spinner instead of rows or the empty state while loading', () => {
    renderWithProviders(
      <DataTable
        title="People"
        columns={columns}
        rows={[]}
        rowKey={(p) => p.id}
        loading
        onClearFilters={vi.fn()}
      />,
    );
    expect(screen.getByRole('status', { name: 'Loading' })).toBeTruthy();
    expect(screen.queryByText('No entries match these filters.')).toBeNull();
  });

  it('opens a row by click or Enter', async () => {
    const onRowClick = vi.fn();
    renderWithProviders(
      <DataTable
        title="People"
        columns={columns}
        rows={people}
        rowKey={(p) => p.id}
        onRowClick={onRowClick}
        onClearFilters={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByText('Grace'));
    expect(onRowClick).toHaveBeenLastCalledWith(people[1]);

    screen.getByText('Ada').closest('tr')?.focus();
    await userEvent.keyboard('{Enter}');
    expect(onRowClick).toHaveBeenLastCalledWith(people[0]);
  });
});
