import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { Subsection } from './Subsection';

describe('Subsection', () => {
  it('renders title, description, action, icon and children when given', () => {
    renderWithProviders(
      <Subsection
        icon={<svg data-testid="icon" />}
        title="Table Example"
        description="Download the example."
        action={<button type="button">Download</button>}
      >
        <div>extra content</div>
      </Subsection>,
    );
    expect(screen.getByText('Table Example')).toBeTruthy();
    expect(screen.getByText('Download the example.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Download' })).toBeTruthy();
    expect(screen.getByTestId('icon')).toBeTruthy();
    expect(screen.getByText('extra content')).toBeTruthy();
  });

  it('omits the optional parts when they are not given', () => {
    const { container } = renderWithProviders(
      <Subsection title="Daily Discussion" />,
    );
    expect(screen.getByText('Daily Discussion')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    expect(container.querySelector('svg')).toBeNull();
    // Only the title text is rendered.
    expect(container.textContent).toBe('Daily Discussion');
  });

  it('puts the icon on the title line when iconPlacement is inline', () => {
    renderWithProviders(
      <Subsection
        icon={<svg data-testid="icon" />}
        iconPlacement="inline"
        title="Table Example"
      />,
    );
    const title = screen.getByText('Table Example');
    expect(title.contains(screen.getByTestId('icon'))).toBe(true);
  });

  it('puts the icon beside the text block by default', () => {
    renderWithProviders(
      <Subsection icon={<svg data-testid="icon" />} title="FileName.csv" />,
    );
    const title = screen.getByText('FileName.csv');
    expect(title.contains(screen.getByTestId('icon'))).toBe(false);
  });
});
