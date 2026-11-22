import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockEntries } from '@api/mocks/entries';
import { renderWithProviders } from '../../test/render';
import { SubmittedEntriesTable } from './SubmittedEntriesTable';

describe('SubmittedEntriesTable', () => {
  it('passes the date of the clicked row', async () => {
    const onRowClick = vi.fn();
    renderWithProviders(
      <SubmittedEntriesTable
        entries={mockEntries}
        onRowClick={onRowClick}
        onClearFilters={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByText('Wed, Oct 28'));
    expect(onRowClick).toHaveBeenCalledWith('2026-10-28');
  });
});
