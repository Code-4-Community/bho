import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { FileItem } from './FileItem';

const file = { name: 'FileName.csv', size: 3 * 1024 ** 2 };

describe('FileItem', () => {
  it('shows the file name and formatted size', () => {
    renderWithProviders(<FileItem file={file} />);
    expect(screen.getByText('FileName.csv')).toBeTruthy();
    expect(screen.getByText('3 MB')).toBeTruthy();
  });

  it('shows the progress bar and percent when progress is given', () => {
    renderWithProviders(<FileItem file={file} progress={49} />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('49');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
    expect(bar.getAttribute('aria-label')).toBeTruthy();
    expect(screen.getByText('49%')).toBeTruthy();
  });

  it('rounds the displayed percent', () => {
    renderWithProviders(<FileItem file={file} progress={48.6} />);
    expect(screen.getByText('49%')).toBeTruthy();
  });

  it.each([
    [150, '100'],
    [-20, '0'],
  ])('clamps progress %d to %s', (progress, expected) => {
    renderWithProviders(<FileItem file={file} progress={progress} />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe(
      expected,
    );
    expect(screen.getByText(`${expected}%`)).toBeTruthy();
  });

  it('shows 0% for progress 0 rather than hiding the bar', () => {
    renderWithProviders(<FileItem file={file} progress={0} />);
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('has no progress bar without progress', () => {
    renderWithProviders(<FileItem file={file} />);
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('has no remove button without onRemove', () => {
    renderWithProviders(<FileItem file={file} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('calls onRemove from a labelled × button', () => {
    const onRemove = vi.fn();
    renderWithProviders(<FileItem file={file} onRemove={onRemove} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove FileName.csv' }),
    );
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
