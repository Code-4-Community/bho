import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { FileRejected } from './FileRejected';

const rejections = [
  { item: 'FileName.pdf', reason: 'Incorrect file format' },
  { item: 'Date []', reason: 'Missing required field' },
];

describe('FileRejected', () => {
  it('renders every rejection item and reason', () => {
    renderWithProviders(<FileRejected rejections={rejections} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    for (const { item, reason } of rejections) {
      expect(screen.getByText(item)).toBeTruthy();
      expect(screen.getByText(reason)).toBeTruthy();
    }
  });

  it('uses "File Rejected" as the default title and accepts a custom one', () => {
    const { rerender } = renderWithProviders(
      <FileRejected rejections={rejections} />,
    );
    expect(screen.getByRole('heading', { name: 'File Rejected' })).toBeTruthy();
    rerender(<FileRejected title="Upload failed" rejections={rejections} />);
    expect(screen.getByRole('heading', { name: 'Upload failed' })).toBeTruthy();
  });

  it('calls onClose from the × button', () => {
    const onClose = vi.fn();
    renderWithProviders(
      <FileRejected rejections={rejections} onClose={onClose} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has no × button when onClose is not passed', () => {
    renderWithProviders(<FileRejected rejections={rejections} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders nothing for an empty list', () => {
    const { container } = renderWithProviders(<FileRejected rejections={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('announces itself as an alert', () => {
    renderWithProviders(<FileRejected rejections={rejections} />);
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('hides the decorative warning icons from assistive tech', () => {
    const { container } = renderWithProviders(
      <FileRejected rejections={rejections} />,
    );
    const icons = container.querySelectorAll('svg');
    expect(icons).toHaveLength(2);
    icons.forEach((icon) =>
      expect(icon.getAttribute('aria-hidden')).toBe('true'),
    );
  });
});
