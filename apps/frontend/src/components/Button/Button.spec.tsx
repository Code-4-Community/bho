import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/render';
import { Button } from './Button';
import { BUTTON_VARIANTS, type ButtonVariant } from './variants';

const VARIANTS = Object.keys(BUTTON_VARIANTS) as ButtonVariant[];

describe('Button', () => {
  it.each(VARIANTS)('renders the label for variant "%s"', (variant) => {
    renderWithProviders(<Button variant={variant}>Label</Button>);
    expect(screen.getByRole('button', { name: 'Label' })).toBeTruthy();
  });

  it('defaults to the primary variant and md size', () => {
    renderWithProviders(<Button>Upload</Button>);
    const button = screen.getByRole('button', { name: 'Upload' });
    expect(button.getAttribute('data-variant')).toBe('primary');
    expect(button.getAttribute('data-size')).toBe('md');
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    renderWithProviders(<Button onClick={onClick}>Go</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn();
    renderWithProviders(
      <Button disabled onClick={onClick}>
        Go
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Go' });
    expect(button).toHaveProperty('disabled', true);
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('is disabled, busy and ignores clicks while loading', () => {
    const onClick = vi.fn();
    renderWithProviders(
      <Button loading onClick={onClick}>
        Submit
      </Button>,
    );
    const button = screen.getByRole('button');
    expect(button).toHaveProperty('disabled', true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('shows loadingText while loading', () => {
    renderWithProviders(
      <Button loading loadingText="Submitting">
        Submit
      </Button>,
    );
    expect(screen.getByText('Submitting')).toBeTruthy();
  });

  it('is not busy when not loading', () => {
    renderWithProviders(<Button>Submit</Button>);
    expect(screen.getByRole('button').getAttribute('aria-busy')).not.toBe(
      'true',
    );
  });

  it('renders leftIcon and rightIcon, hidden from assistive tech', () => {
    renderWithProviders(
      <Button
        leftIcon={<svg data-testid="left" />}
        rightIcon={<svg data-testid="right" />}
      >
        Source: All
      </Button>,
    );
    const left = screen.getByTestId('left');
    const right = screen.getByTestId('right');
    expect(left.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(right.closest('[aria-hidden="true"]')).not.toBeNull();
    // The icons don't change the accessible name.
    expect(screen.getByRole('button', { name: 'Source: All' })).toBeTruthy();
  });

  it('is reachable by aria-label when icon-only', () => {
    renderWithProviders(
      <Button
        variant="ghost"
        aria-label="Open entry"
        leftIcon={<svg data-testid="chevron" />}
      />,
    );
    expect(screen.getByRole('button', { name: 'Open entry' })).toBeTruthy();
  });

  it('defaults to type="button" and passes type="submit" through', () => {
    const { unmount } = renderWithProviders(<Button>A</Button>);
    expect(screen.getByRole('button', { name: 'A' }).getAttribute('type')).toBe(
      'button',
    );
    unmount();
    renderWithProviders(<Button type="submit">B</Button>);
    expect(screen.getByRole('button', { name: 'B' }).getAttribute('type')).toBe(
      'submit',
    );
  });

  it('renders a real link when href is given', () => {
    renderWithProviders(
      <Button variant="link" href="/entry/today">
        Today’s Entry
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'Today’s Entry' });
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toBe('/entry/today');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('adds rel for links that open in a new tab', () => {
    renderWithProviders(
      <Button variant="link" href="https://example.com" target="_blank">
        Docs
      </Button>,
    );
    expect(screen.getByRole('link', { name: 'Docs' }).getAttribute('rel')).toBe(
      'noopener noreferrer',
    );
  });

  it('works as the child of asChild with a custom link', () => {
    renderWithProviders(
      <Button asChild variant="link">
        <a href="/x">Custom</a>
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'Custom' });
    expect(link.getAttribute('href')).toBe('/x');
    expect(link.hasAttribute('type')).toBe(false);
  });
});
