import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/render';
import { Filter, type FilterOption } from './Filter';

const OPTIONS: FilterOption[] = [
  { value: 'all', label: 'All uploaders' },
  { value: 'intern', label: 'Intern' },
  { value: 'admin', label: 'Admin' },
];

const trigger = () => screen.getByRole('combobox');

function Controlled({
  onChange = () => undefined,
  initial = 'all',
  ...rest
}: {
  onChange?: (value: string) => void;
  initial?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  placeholder?: string;
}) {
  const [value, setValue] = useState(initial);
  return (
    <Filter
      label="Uploaded by"
      options={OPTIONS}
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
      {...rest}
    />
  );
}

describe('Filter', () => {
  it('shows the label and the label of the current value', () => {
    renderWithProviders(<Controlled initial="intern" />);
    expect(screen.getByText('Uploaded by')).toBeTruthy();
    expect(trigger().textContent).toContain('Intern');
  });

  it('wires the label to the trigger', () => {
    renderWithProviders(<Controlled />);
    expect(screen.getByRole('combobox', { name: /Uploaded by/ })).toBeTruthy();
  });

  it('shows the placeholder when the value matches no option', () => {
    renderWithProviders(<Controlled initial="nope" placeholder="Pick one" />);
    expect(trigger().textContent).toContain('Pick one');
  });

  it('opens the options when the trigger is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Controlled />);
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    await user.click(trigger());
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(await screen.findAllByRole('option')).toHaveLength(3);
  });

  it('marks the current option as selected', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Controlled initial="intern" />);
    await user.click(trigger());
    const intern = await screen.findByRole('option', { name: 'Intern' });
    expect(intern.getAttribute('aria-selected')).toBe('true');
    expect(
      screen
        .getByRole('option', { name: 'Admin' })
        .getAttribute('aria-selected'),
    ).toBe('false');
  });

  it('calls onChange with the value and closes when an option is picked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(<Controlled onChange={onChange} />);
    await user.click(trigger());
    await user.click(await screen.findByRole('option', { name: 'Admin' }));
    expect(onChange).toHaveBeenCalledWith('admin');
    await waitFor(() =>
      expect(trigger().getAttribute('aria-expanded')).toBe('false'),
    );
    expect(trigger().textContent).toContain('Admin');
  });

  it('opens with Enter and selects with arrows + Enter', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(<Controlled onChange={onChange} />);
    trigger().focus();

    await user.keyboard('{Enter}');
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    await screen.findAllByRole('option');

    await user.keyboard('{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(trigger().getAttribute('aria-expanded')).toBe('false'),
    );
  });

  it('opens with ArrowDown and closes with Escape', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Controlled />);
    trigger().focus();

    await user.keyboard('{ArrowDown}');
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    await screen.findAllByRole('option');

    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(trigger().getAttribute('aria-expanded')).toBe('false'),
    );
  });

  it('cannot be opened when disabled', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Controlled disabled />);
    expect(trigger().hasAttribute('disabled')).toBe(true);
    await user.click(trigger());
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('renders the leading icon', () => {
    renderWithProviders(<Controlled icon={<svg data-testid="calendar" />} />);
    expect(screen.getByTestId('calendar')).toBeTruthy();
  });
});
