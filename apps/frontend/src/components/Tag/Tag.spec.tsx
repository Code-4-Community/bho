import { screen } from '@testing-library/react';
import { renderWithProviders as render } from '../../test/render';
import { Tag, TAG_VARIANTS, TagVariant } from './Tag';

const variants = Object.entries(TAG_VARIANTS) as [
  TagVariant,
  (typeof TAG_VARIANTS)[TagVariant],
][];

describe('Tag', () => {
  it.each(variants)('renders the default label for %s', (variant, preset) => {
    render(<Tag variant={variant} />);
    expect(screen.getByText(preset.label)).toBeInTheDocument();
  });

  it.each(variants)('applies the tone for %s', (variant, preset) => {
    render(<Tag variant={variant} />);
    expect(screen.getByText(preset.label)).toHaveAttribute(
      'data-tone',
      preset.tone,
    );
  });

  it('renders the count after the label', () => {
    render(<Tag variant="corrected" count={3} />);
    expect(screen.getByText('Corrected (3)')).toBeInTheDocument();
  });

  it('renders a count of 0', () => {
    render(<Tag variant="corrected" count={0} />);
    expect(screen.getByText('Corrected (0)')).toBeInTheDocument();
  });

  it('renders no parentheses without a count', () => {
    render(<Tag variant="corrected" />);
    expect(screen.getByText('Corrected').textContent).not.toContain('(');
  });

  it('lets children override the label', () => {
    render(
      <Tag variant="submitted" tone="warning">
        Past Entry 10/31
      </Tag>,
    );
    expect(screen.queryByText('Submitted')).not.toBeInTheDocument();
    expect(screen.getByText('Past Entry 10/31')).toHaveAttribute(
      'data-tone',
      'warning',
    );
  });

  it('lets tone override the variant tone', () => {
    render(<Tag variant="submitted" tone="danger" />);
    expect(screen.getByText('Submitted')).toHaveAttribute(
      'data-tone',
      'danger',
    );
  });

  it('uses tone alone with children', () => {
    render(<Tag tone="success">Today&apos;s Entry 11/1</Tag>);
    expect(screen.getByText("Today's Entry 11/1")).toHaveAttribute(
      'data-tone',
      'success',
    );
  });
});
