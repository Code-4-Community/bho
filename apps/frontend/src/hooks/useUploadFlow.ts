import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import {
  previewImport,
  requestUploadUrl,
  uploadToPresignedUrl,
} from '@api/imports';
import type { UploadKind } from '@api/types';

export type UploadStatus =
  | 'idle'
  | 'uploading'
  | 'previewing'
  | 'ready'
  | 'invalid'
  | 'error';

export function useUploadFlow(kind: UploadKind) {
  const [step, setStep] = useState<'uploading' | 'previewing'>('uploading');
  const [progress, setProgress] = useState(0);
  const controller = useRef<AbortController>();

  const mutation = useMutation({
    mutationFn: async ({
      file,
      signal,
    }: {
      file: File;
      signal: AbortSignal;
    }) => {
      const { uploadUrl, s3Key } = await requestUploadUrl(kind, file.name);
      await uploadToPresignedUrl(uploadUrl, file, {
        onProgress: setProgress,
        signal,
      });
      setStep('previewing');
      return {
        s3Key,
        fileName: file.name,
        preview: await previewImport(s3Key),
      };
    },
  });

  let status: UploadStatus = 'idle';
  if (mutation.isPending) status = step;
  else if (mutation.isError) status = 'error';
  else if (mutation.data)
    status = 'errors' in mutation.data.preview ? 'invalid' : 'ready';

  return {
    status,
    progress,
    error: mutation.error,
    preview: mutation.data?.preview,
    s3Key: mutation.data?.s3Key,
    fileName: mutation.data?.fileName,
    upload: (file: File) => {
      controller.current = new AbortController();
      setStep('uploading');
      setProgress(0);
      mutation.mutate({ file, signal: controller.current.signal });
    },
    reset: () => {
      controller.current?.abort();
      mutation.reset();
    },
  };
}
