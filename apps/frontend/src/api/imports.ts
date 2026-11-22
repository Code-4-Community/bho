import { mockPreview } from '@api/mocks/preview';
import type { ImportPreview, UploadKind, UploadUrl } from '@api/types';

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    signal?.throwIfAborted();
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });

export async function requestUploadUrl(
  kind: UploadKind,
  fileName: string,
): Promise<UploadUrl> {
  await wait(300);
  const s3Key = `${kind}/${new Date()
    .toISOString()
    .slice(0, 10)}/${crypto.randomUUID()}.csv`;
  return {
    uploadUrl: `https://mock-uploads.local/${s3Key}?fileName=${encodeURIComponent(
      fileName,
    )}`,
    s3Key,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  };
}

export async function uploadToPresignedUrl(
  uploadUrl: string,
  file: File,
  {
    onProgress,
    signal,
  }: { onProgress?: (percent: number) => void; signal?: AbortSignal } = {},
): Promise<void> {
  for (const percent of [20, 40, 60, 80, 100]) {
    await wait(200, signal);
    onProgress?.(percent);
  }
}

export async function previewImport(s3Key: string): Promise<ImportPreview> {
  await wait(500);
  return { ...mockPreview, kind: s3Key.split('/')[0] as UploadKind };
}
