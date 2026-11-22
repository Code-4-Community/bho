import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockErrorLog } from '@api/mocks/errorLog';
import { renderWithProviders } from '../../test/render';
import { ErrorLogTable } from './ErrorLogTable';

describe('ErrorLogTable', () => {
  it('reports the source and range picked from the filters', async () => {
    const onSourceChange = vi.fn();
    const onRangeChange = vi.fn();
    renderWithProviders(
      <ErrorLogTable
        entries={mockErrorLog}
        source="all"
        range="24h"
        onSourceChange={onSourceChange}
        onRangeChange={onRangeChange}
        onClearFilters={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Source: All' }));
    await userEvent.click(
      await screen.findByRole('menuitemradio', { name: 'APRSWxNet' }),
    );
    expect(onSourceChange).toHaveBeenCalledWith('APRSWxNet');

    await userEvent.click(screen.getByRole('button', { name: 'Last 24hr' }));
    await userEvent.click(
      await screen.findByRole('menuitemradio', { name: 'Last month' }),
    );
    expect(onRangeChange).toHaveBeenCalledWith('month');
  });
});
