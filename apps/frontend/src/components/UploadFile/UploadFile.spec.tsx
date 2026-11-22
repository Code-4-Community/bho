import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/render';
import { UploadFile, type UploadFileProps } from './UploadFile';

const csv = (name = 'FileName.csv') =>
  new File(['a,b\n1,2'], name, { type: 'text/csv' });

const oversized = () => {
  const file = csv('big.csv');
  Object.defineProperty(file, 'size', { value: 2 * 1024 ** 3 });
  return file;
};

const setup = (props: Partial<UploadFileProps> = {}) => {
  const handlers = {
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    onClose: vi.fn(),
    onReject: vi.fn(),
    onFileChange: vi.fn(),
  };
  const utils = renderWithProviders(<UploadFile {...handlers} {...props} />);
  return {
    ...handlers,
    ...utils,
    input: screen.getByTestId('upload-file-input'),
    dropzone: screen.getByRole('group', { name: 'File dropzone' }),
  };
};

const chooseFile = (input: HTMLElement, ...files: File[]) =>
  fireEvent.change(input, { target: { files } });

const submit = () => screen.getByRole('button', { name: 'Submit' });

describe('UploadFile', () => {
  describe('types', () => {
    it('upload type shows the title, close × and Cancel', () => {
      setup({ type: 'upload' });
      expect(screen.getByRole('heading', { name: 'Upload File' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
    });

    it('reupload type has no close × and no Cancel', () => {
      setup({ type: 'reupload' });
      expect(
        screen.getByRole('heading', { name: 'Re-Upload File' }),
      ).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
    });

    it('lets title override the default', () => {
      setup({ title: 'Replace table' });
      expect(
        screen.getByRole('heading', { name: 'Replace table' }),
      ).toBeTruthy();
    });

    it('Cancel and close × call their handlers', () => {
      const { onCancel, onClose } = setup();
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('selecting a file', () => {
    it('disables Submit with no file', () => {
      setup();
      expect((submit() as HTMLButtonElement).disabled).toBe(true);
    });

    it('shows the file and submits it after choosing a valid .csv', () => {
      const { input, onSubmit, onFileChange } = setup();
      const file = csv();
      chooseFile(input, file);

      expect(screen.getByText('FileName.csv')).toBeTruthy();
      expect(onFileChange).toHaveBeenCalledWith(file);
      expect((submit() as HTMLButtonElement).disabled).toBe(false);

      fireEvent.click(submit());
      expect(onSubmit).toHaveBeenCalledWith(file);
    });

    it('opens the file picker from the Choose file button', () => {
      const { input } = setup();
      const click = vi.spyOn(input as HTMLInputElement, 'click');
      fireEvent.click(screen.getByRole('button', { name: 'Choose file' }));
      expect(click).toHaveBeenCalledTimes(1);
    });

    it('accepts an uppercase extension', () => {
      const { input } = setup();
      chooseFile(input, csv('DATA.CSV'));
      expect(screen.getByText('DATA.CSV')).toBeTruthy();
    });

    it('replaces the current file when a second one is chosen', () => {
      const { input } = setup();
      chooseFile(input, csv('first.csv'));
      chooseFile(input, csv('second.csv'));
      expect(screen.queryByText('first.csv')).toBeNull();
      expect(screen.getByText('second.csv')).toBeTruthy();
    });

    it('uses only the first of several files', () => {
      const { input } = setup();
      chooseFile(input, csv('one.csv'), csv('two.csv'));
      expect(screen.getByText('one.csv')).toBeTruthy();
      expect(screen.queryByText('two.csv')).toBeNull();
    });

    it('starts with defaultFile selected', () => {
      setup({ defaultFile: csv('preset.csv') });
      expect(screen.getByText('preset.csv')).toBeTruthy();
      expect((submit() as HTMLButtonElement).disabled).toBe(false);
    });
  });

  describe('validation', () => {
    it('rejects a wrong extension without selecting the file', () => {
      const { input, onReject, onFileChange } = setup();
      chooseFile(
        input,
        new File(['x'], 'FileName.pdf', { type: 'application/pdf' }),
      );

      expect(onReject).toHaveBeenCalledWith([
        { item: 'FileName.pdf', reason: 'Incorrect file format' },
      ]);
      expect(onFileChange).not.toHaveBeenCalled();
      expect(screen.queryByText('FileName.pdf')).toBeNull();
      expect((submit() as HTMLButtonElement).disabled).toBe(true);
    });

    it('does not trust the MIME type over the extension', () => {
      const { input } = setup();
      chooseFile(input, new File(['x'], 'data.csv', { type: '' }));
      expect(screen.getByText('data.csv')).toBeTruthy();
    });

    it('rejects an oversized file with the size reason', () => {
      const { input, onReject } = setup();
      chooseFile(input, oversized());
      expect(onReject).toHaveBeenCalledWith([
        { item: 'big.csv', reason: 'File exceeds maximum size' },
      ]);
      expect(screen.queryByText('big.csv')).toBeNull();
    });

    it('keeps the current file when a new one is rejected', () => {
      const { input } = setup();
      chooseFile(input, csv('keep.csv'));
      chooseFile(input, new File(['x'], 'bad.pdf'));
      expect(screen.getByText('keep.csv')).toBeTruthy();
    });

    it('honors accept and maxSizeBytes props', () => {
      const { input, onReject } = setup({
        accept: ['.txt'],
        maxSizeBytes: 5,
      });
      chooseFile(input, csv('a.csv'));
      expect(onReject).toHaveBeenLastCalledWith([
        { item: 'a.csv', reason: 'Incorrect file format' },
      ]);
      chooseFile(input, new File(['123456'], 'long.txt'));
      expect(onReject).toHaveBeenLastCalledWith([
        { item: 'long.txt', reason: 'File exceeds maximum size' },
      ]);
    });

    it('shows helper text derived from the props', () => {
      setup({ accept: ['.csv', '.tsv'], maxSizeBytes: 5 * 1024 ** 2 });
      expect(screen.getByText('Supported format: .csv, .tsv')).toBeTruthy();
      expect(screen.getByText('Maximum size: 5 MB')).toBeTruthy();
    });

    it('defaults the helper text to .csv and 1 GB', () => {
      setup();
      expect(screen.getByText('Supported format: .csv')).toBeTruthy();
      expect(screen.getByText('Maximum size: 1 GB')).toBeTruthy();
    });
  });

  describe('drag and drop', () => {
    it('selects a valid dropped file', () => {
      const { dropzone } = setup();
      fireEvent.drop(dropzone, {
        dataTransfer: { files: [csv('dropped.csv')] },
      });
      expect(screen.getByText('dropped.csv')).toBeTruthy();
    });

    it('rejects an invalid dropped file', () => {
      const { dropzone, onReject } = setup();
      fireEvent.drop(dropzone, {
        dataTransfer: { files: [new File(['x'], 'bad.pdf')] },
      });
      expect(onReject).toHaveBeenCalledTimes(1);
    });

    it('sets data-dragging on dragenter and clears it on dragleave', () => {
      const { dropzone } = setup();
      fireEvent.dragEnter(dropzone);
      expect(dropzone.getAttribute('data-dragging')).toBe('true');
      fireEvent.dragLeave(dropzone);
      expect(dropzone.getAttribute('data-dragging')).toBe('false');
    });

    it('clears data-dragging on drop', () => {
      const { dropzone } = setup();
      fireEvent.dragEnter(dropzone);
      fireEvent.drop(dropzone, { dataTransfer: { files: [csv()] } });
      expect(dropzone.getAttribute('data-dragging')).toBe('false');
    });

    it('stays in drag-over while crossing child elements', () => {
      const { dropzone } = setup();
      const child = screen.getByText('Choose file');
      fireEvent.dragEnter(dropzone);
      fireEvent.dragEnter(child);
      fireEvent.dragLeave(dropzone);
      expect(dropzone.getAttribute('data-dragging')).toBe('true');
      fireEvent.dragLeave(child);
      expect(dropzone.getAttribute('data-dragging')).toBe('false');
    });

    it('calls preventDefault on dragover so drops fire', () => {
      const { dropzone } = setup();
      const notCancelled = fireEvent.dragOver(dropzone);
      expect(notCancelled).toBe(false);
    });
  });

  describe('removing the file', () => {
    it('hides the file row and disables Submit again', () => {
      const { input, onFileChange } = setup();
      chooseFile(input, csv());
      fireEvent.click(
        screen.getByRole('button', { name: 'Remove FileName.csv' }),
      );

      expect(screen.queryByText('FileName.csv')).toBeNull();
      expect((submit() as HTMLButtonElement).disabled).toBe(true);
      expect(onFileChange).toHaveBeenLastCalledWith(null);
    });

    it('clears the input value so the same file can be chosen again', () => {
      const { input } = setup();
      const el = input as HTMLInputElement;
      chooseFile(input, csv());
      fireEvent.click(
        screen.getByRole('button', { name: 'Remove FileName.csv' }),
      );
      expect(el.value).toBe('');
    });

    it('does not call onCancel when removing before uploading', () => {
      const { input, onCancel } = setup();
      chooseFile(input, csv());
      fireEvent.click(
        screen.getByRole('button', { name: 'Remove FileName.csv' }),
      );
      expect(onCancel).not.toHaveBeenCalled();
    });
  });

  describe('uploading', () => {
    it('shows progress and disables Submit and the dropzone', () => {
      setup({ defaultFile: csv(), progress: 49 });
      expect(
        screen.getByRole('progressbar').getAttribute('aria-valuenow'),
      ).toBe('49');
      expect((submit() as HTMLButtonElement).disabled).toBe(true);
      expect(
        (
          screen.getByRole('button', {
            name: 'Choose file',
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(true);
    });

    it('treats isSubmitting as uploading', () => {
      setup({ defaultFile: csv(), isSubmitting: true });
      expect((submit() as HTMLButtonElement).disabled).toBe(true);
    });

    it('ignores drops while uploading', () => {
      const { dropzone, onFileChange } = setup({
        defaultFile: csv('current.csv'),
        progress: 10,
      });
      fireEvent.drop(dropzone, { dataTransfer: { files: [csv('new.csv')] } });
      expect(onFileChange).not.toHaveBeenCalled();
      expect(screen.getByText('current.csv')).toBeTruthy();
    });

    it('does not enter drag-over while uploading', () => {
      const { dropzone } = setup({ defaultFile: csv(), progress: 10 });
      fireEvent.dragEnter(dropzone);
      expect(dropzone.getAttribute('data-dragging')).toBe('false');
    });

    it('acts as cancel when the file × is used mid-upload', () => {
      const { onCancel } = setup({ defaultFile: csv(), progress: 10 });
      fireEvent.click(
        screen.getByRole('button', { name: 'Remove FileName.csv' }),
      );
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });
});
