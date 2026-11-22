import { screen } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/render';
import userEvent from '@testing-library/user-event';
import { Section } from './Section';
import { SectionRow } from './SectionRow';
import { DateTimeHeading } from './DateTimeHeading';

describe('Section', () => {
  it('renders the title as a heading at the given level', () => {
    render(<Section title="Open Items" headingLevel={3} />);
    expect(
      screen.getByRole('heading', { level: 3, name: 'Open Items' }),
    ).toBeInTheDocument();
  });

  it('shows the empty message with no children', () => {
    render(<Section title="T" emptyMessage="No items" />);
    expect(screen.getByText('No items')).toBeInTheDocument();
  });

  it('shows the default empty message', () => {
    render(<Section title="T">{null}</Section>);
    expect(screen.getByText('Nothing to show yet.')).toBeInTheDocument();
  });

  it('shows a skeleton while loading, hiding children and empty message', () => {
    render(
      <Section title="T" isLoading>
        <SectionRow heading="Row one" />
      </Section>,
    );
    expect(screen.getByRole('list')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getAllByTestId('section-skeleton')).toHaveLength(3);
    expect(screen.queryByText('Row one')).not.toBeInTheDocument();
    expect(screen.queryByText('Nothing to show yet.')).not.toBeInTheDocument();
  });

  it('does not show the empty message while loading with no children', () => {
    render(<Section title="T" isLoading />);
    expect(screen.queryByText('Nothing to show yet.')).not.toBeInTheDocument();
  });

  it('renders children in order when loaded', () => {
    render(
      <Section title="T">
        <SectionRow heading="First" />
        <SectionRow heading="Second" />
      </Section>,
    );
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('First');
    expect(items[1]).toHaveTextContent('Second');
    expect(screen.getByRole('list')).toHaveAttribute('aria-busy', 'false');
  });

  it('renders a text header action', () => {
    render(<Section title="T" headerAction="2 uploads" />);
    expect(screen.getByText('2 uploads')).toBeInTheDocument();
  });

  it('renders a link header action', () => {
    render(<Section title="T" headerAction={<a href="/all">View all</a>} />);
    expect(screen.getByRole('link', { name: 'View all' })).toHaveAttribute(
      'href',
      '/all',
    );
  });

  it('scrolls the body when maxHeight is set', () => {
    render(
      <Section title="T" maxHeight={200}>
        <SectionRow heading="Row" />
      </Section>,
    );
    expect(screen.getByRole('list')).toHaveStyle({ maxHeight: '200px' });
  });
});

describe('SectionRow', () => {
  it('calls onClick once on click', async () => {
    const onClick = vi.fn();
    render(<SectionRow heading="Row" onClick={onClick} />);
    await userEvent.click(screen.getByRole('button', { name: /Row/ }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('activates with Enter from the keyboard', async () => {
    const onClick = vi.fn();
    render(<SectionRow heading="Row" onClick={onClick} />);
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders as a link when href is set', () => {
    render(<SectionRow heading="Row" href="/item/1" />);
    expect(screen.getByRole('link', { name: /Row/ })).toHaveAttribute(
      'href',
      '/item/1',
    );
  });

  it('is not interactive without href or onClick', () => {
    render(<SectionRow heading="Row" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('marks a highlighted row', () => {
    render(<SectionRow heading="Row" highlighted />);
    expect(screen.getByRole('listitem')).toHaveAttribute(
      'data-highlighted',
      'true',
    );
  });

  it('is not highlighted by default', () => {
    render(<SectionRow heading="Row" />);
    expect(screen.getByRole('listitem')).toHaveAttribute(
      'data-highlighted',
      'false',
    );
  });

  it('renders the subtitle as a link with subtitleHref', () => {
    render(
      <SectionRow
        heading="Row"
        subtitle="FileName.csv"
        subtitleHref="/files/1"
      />,
    );
    expect(screen.getByRole('link', { name: 'FileName.csv' })).toHaveAttribute(
      'href',
      '/files/1',
    );
  });

  it('does not trigger the row onClick when the subtitle link is clicked', async () => {
    const onClick = vi.fn();
    render(
      <SectionRow
        heading="Row"
        subtitle="FileName.csv"
        subtitleHref="#file"
        onClick={onClick}
      />,
    );
    await userEvent.click(screen.getByRole('link', { name: 'FileName.csv' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders tag, label, plain subtitle and chevron slots', () => {
    const { container } = render(
      <SectionRow
        heading="Row"
        label="Peak Gust"
        subtitle="Out of Range: 112 mph"
        tag={<span>Tagged</span>}
        trailing="chevron"
      />,
    );
    expect(screen.getByText('Peak Gust')).toBeInTheDocument();
    expect(screen.getByText('Out of Range: 112 mph')).toBeInTheDocument();
    expect(screen.getByText('Tagged')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeInTheDocument();
  });
});

describe('DateTimeHeading', () => {
  it('renders date and time', () => {
    const { container } = render(
      <DateTimeHeading date="Nov 1, 2026" time="13:00 - 14:00" />,
    );
    expect(container).toHaveTextContent('Nov 1, 2026 | 13:00 - 14:00');
  });

  it('renders the date alone without a separator', () => {
    const { container } = render(<DateTimeHeading date="Nov 1, 2026" />);
    expect(container).toHaveTextContent(/^Nov 1, 2026$/);
  });
});
