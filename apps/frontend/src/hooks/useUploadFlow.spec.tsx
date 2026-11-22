import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  previewImport,
  requestUploadUrl,
  uploadToPresignedUrl,
} from '@api/imports';
import { mockInvalidPreview, mockPreview } from '@api/mocks/preview';
import { createQueryClient } from '@api/queryClient';
import type { ImportPreview, UploadKind } from '@api/types';
import { useUploadFlow } from './useUploadFlow';

vi.mock('@api/imports');

const s3Key = 'daily/2026-11-22/abc.csv';
const file = new File(['date,temp'], 'November 2026.csv');

const renderUploadFlow = (kind: UploadKind = 'daily') => {
  const client = createQueryClient();
  return renderHook(() => useUploadFlow(kind), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requestUploadUrl).mockResolvedValue({
    uploadUrl: 'https://bucket.s3.amazonaws.com/put',
    s3Key,
    expiresAt: '2026-11-22T12:05:00.000Z',
  });
  vi.mocked(uploadToPresignedUrl).mockResolvedValue();
  vi.mocked(previewImport).mockResolvedValue(mockPreview);
});

describe('useUploadFlow', () => {
  it('uploads with progress, previews, then returns what commit needs', async () => {
    let finishUpload: () => void = () => undefined;
    vi.mocked(uploadToPresignedUrl).mockImplementation(
      (_url, _file, options) =>
        new Promise<void>((resolve) => {
          options?.onProgress?.(40);
          finishUpload = resolve;
        }),
    );
    let finishPreview: (preview: ImportPreview) => void = () => undefined;
    vi.mocked(previewImport).mockImplementation(
      () =>
        new Promise<ImportPreview>((resolve) => {
          finishPreview = resolve;
        }),
    );

    const { result } = renderUploadFlow();
    act(() => result.current.upload(file));

    await waitFor(() => expect(result.current.progress).toBe(40));
    expect(result.current.status).toBe('uploading');
    expect(requestUploadUrl).toHaveBeenCalledWith('daily', 'November 2026.csv');

    act(() => finishUpload());
    await waitFor(() => expect(result.current.status).toBe('previewing'));
    expect(previewImport).toHaveBeenCalledWith(s3Key);

    act(() => finishPreview(mockPreview));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current).toMatchObject({
      preview: mockPreview,
      s3Key,
      fileName: 'November 2026.csv',
    });
  });

  it('ends as invalid when the preview has row errors', async () => {
    vi.mocked(previewImport).mockResolvedValue(mockInvalidPreview);
    const { result } = renderUploadFlow('historical');

    act(() => result.current.upload(file));

    await waitFor(() => expect(result.current.status).toBe('invalid'));
    expect(result.current.preview).toEqual(mockInvalidPreview);
    expect(requestUploadUrl).toHaveBeenCalledWith(
      'historical',
      'November 2026.csv',
    );
  });

  it('ends as error when a step fails, and a new upload recovers', async () => {
    vi.mocked(requestUploadUrl).mockRejectedValueOnce(
      new Error('Network Error'),
    );
    const { result } = renderUploadFlow();

    act(() => result.current.upload(file));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error?.message).toBe('Network Error');

    act(() => result.current.upload(file));
    await waitFor(() => expect(result.current.status).toBe('ready'));
  });

  it('aborts the upload on reset and goes back to idle', async () => {
    let signal: AbortSignal | undefined;
    vi.mocked(uploadToPresignedUrl).mockImplementation(
      (_url, _file, options) =>
        new Promise((_, reject) => {
          signal = options?.signal;
          signal?.addEventListener('abort', () => reject(signal?.reason));
        }),
    );
    const { result } = renderUploadFlow();

    act(() => result.current.upload(file));
    await waitFor(() => expect(signal).toBeDefined());

    act(() => result.current.reset());

    expect(signal?.aborted).toBe(true);
    await waitFor(() => expect(result.current.status).toBe('idle'));
    expect(previewImport).not.toHaveBeenCalled();
  });
});
