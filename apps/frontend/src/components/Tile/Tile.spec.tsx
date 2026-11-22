import { render, screen } from '@testing-library/react';
import { Tile } from './Tile';

describe('Tile', () => {
  it('renders a dash for null', () => {
    render(<Tile label="Rejected Values" value={null} />);
    expect(screen.getByLabelText('No data')).toHaveTextContent('—');
  });

  it('renders a dash for undefined', () => {
    render(<Tile label="Rejected Values" value={undefined} />);
    expect(screen.getByLabelText('No data')).toHaveTextContent('—');
  });

  it('renders 0 as a value, not a dash', () => {
    render(<Tile label="Rejected Values" value={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.queryByLabelText('No data')).not.toBeInTheDocument();
  });

  it('renders label, value and caption', () => {
    render(
      <Tile
        label="Last Upload Time"
        value="13:59:59"
        caption="uploaded by: John Doe"
      />,
    );
    expect(screen.getByText('Last Upload Time')).toBeInTheDocument();
    expect(screen.getByText('13:59:59')).toBeInTheDocument();
    expect(screen.getByText('uploaded by: John Doe')).toBeInTheDocument();
  });

  it.each(['warning', 'info', 'success'] as const)(
    'shows a tone icon for %s',
    (tone) => {
      const { container } = render(<Tile label="L" value={1} tone={tone} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
      expect(screen.getByText(/^Status:/)).toBeInTheDocument();
    },
  );

  it('shows no icon for neutral', () => {
    const { container } = render(<Tile label="L" value={1} />);
    expect(container.querySelector('svg')).not.toBeInTheDocument();
    expect(screen.queryByText(/^Status:/)).not.toBeInTheDocument();
  });
});
