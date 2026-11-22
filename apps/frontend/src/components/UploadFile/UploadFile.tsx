import {
  Box,
  Button,
  Flex,
  Heading,
  IconButton,
  Text,
  chakra,
} from '@chakra-ui/react';
import { useRef, useState } from 'react';
import { formatFileSize } from '../../utils/formatFileSize';
import { FileItem } from '../FileItem';
import { CloseIcon, UploadCircleIcon } from '../icons';
import {
  BODY_MD,
  BODY_SM,
  H2,
  closeButtonProps,
  primaryButtonProps,
  secondaryButtonProps,
} from '../styles';
import type { FileRejection, UploadFileType } from './types';
import { validateFile } from './validateFile';

export interface UploadFileProps {
  /** `upload` has a close × and Cancel and a taller dropzone; `reupload` has neither. Default `upload`. */
  type?: UploadFileType;
  /** Defaults from `type`: "Upload File" / "Re-Upload File". */
  title?: string;
  /** Extensions (".csv") or MIME types. Default `['.csv']`. */
  accept?: string[];
  /** Largest file allowed, in bytes. Default 1 GB. */
  maxSizeBytes?: number;
  /** 0-100, controlled by the parent. Its presence means "uploading". */
  progress?: number;
  /** Explicit uploading flag for when there is no progress value yet. */
  isSubmitting?: boolean;
  /** Initial selection (uncontrolled), e.g. for the re-upload preview. */
  defaultFile?: File | null;
  /** Called with the selected file when Submit is pressed. */
  onSubmit: (file: File) => void;
  /** `upload` type only. Also called when the file row's × is used mid-upload. */
  onCancel?: () => void;
  /** `upload` type header ×. */
  onClose?: () => void;
  /** Called instead of selecting when a file fails validation. */
  onReject?: (rejections: FileRejection[]) => void;
  /** Called with the new file when one is selected, and with `null` when it is removed. */
  onFileChange?: (file: File | null) => void;
}

const DEFAULT_ACCEPT = ['.csv'];
const DEFAULT_MAX_SIZE = 1024 ** 3; // 1 GB

const TITLES: Record<UploadFileType, string> = {
  upload: 'Upload File',
  reupload: 'Re-Upload File',
};

// Figma shows the blue style for drag-over and for the uploading variant.
const BLUE_STATE = {
  borderColor: 'var(--blue-400)',
  bg: 'var(--blue-50)',
  '& .upload-file-icon': { color: 'var(--blue-500)' },
};

/**
 * UploadFile
 *
 * The panel for choosing a file to upload: a header, a drag-and-drop zone with
 * a "Choose file" button, helper text, the selected file, and the footer
 * buttons. It selects, validates and displays a file and shows the progress the
 * parent passes in. It does not send anything anywhere; the parent does that in
 * `onSubmit`.
 *
 * Behavior:
 * - One file at a time. Choosing or dropping a new file replaces the current
 *   one. If several are dropped, only the first is used.
 * - A file is checked against `accept` (extension, case-insensitive) and
 *   `maxSizeBytes`. A bad file is not selected; `onReject` gets the reason and
 *   the parent decides whether to show a `FileRejected`.
 * - The dropzone is also usable by keyboard through the "Choose file" button,
 *   which opens a hidden file input.
 * - While `progress` or `isSubmitting` is set, Submit and the dropzone are
 *   disabled, and the file row's × acts as cancel (it calls `onCancel`).
 * - `data-dragging="true"` is set on the dropzone while a file is dragged over
 *   it, and `data-uploading="true"` while uploading (both use the blue style).
 *
 * This is the panel only. Put it in a modal yourself if you need one.
 *
 * @example
 * <UploadFile
 *   type="upload"
 *   progress={progress}
 *   onSubmit={(file) => startUpload(file)}
 *   onCancel={cancelUpload}
 *   onClose={closeModal}
 *   onReject={setRejections}
 * />
 */
export const UploadFile: React.FC<UploadFileProps> = ({
  type = 'upload',
  title,
  accept = DEFAULT_ACCEPT,
  maxSizeBytes = DEFAULT_MAX_SIZE,
  progress,
  isSubmitting = false,
  defaultFile = null,
  onSubmit,
  onCancel,
  onClose,
  onReject,
  onFileChange,
}) => {
  const [file, setFile] = useState<File | null>(defaultFile);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // dragenter/dragleave also fire when crossing child elements; count them so
  // the drag-over style doesn't flicker off.
  const dragDepth = useRef(0);

  const isUploading = progress !== undefined || isSubmitting;
  const isUpload = type === 'upload';

  const resetInput = () => {
    if (inputRef.current) inputRef.current.value = '';
  };

  // One file at a time: if several are dropped or chosen, only the first is used.
  const selectFiles = (files: FileList | File[] | null | undefined) => {
    const next = files?.[0];
    if (!next) return;

    const rejections = validateFile(next, accept, maxSizeBytes);
    if (rejections) {
      resetInput();
      onReject?.(rejections);
      return;
    }
    setFile(next);
    onFileChange?.(next);
  };

  const removeFile = () => {
    setFile(null);
    resetInput(); // so choosing the same file again still fires `change`
    onFileChange?.(null);
    if (isUploading) onCancel?.();
  };

  const endDrag = () => {
    dragDepth.current = 0;
    setDragging(false);
  };

  return (
    <Flex
      direction="column"
      gap="18px"
      w="100%"
      maxW="668px"
      p="var(--space-6) var(--space-4) var(--space-5)"
      borderRadius="var(--radius-md)"
      bg="var(--color-bg-card)"
      data-type={type}
    >
      <Flex direction="column" gap="var(--space-3)">
        <Flex align="flex-start" justify="space-between" minH="35px">
          <Heading as="h2" color="var(--color-text)" {...H2}>
            {title ?? TITLES[type]}
          </Heading>
          {isUpload && (
            <IconButton
              {...closeButtonProps}
              aria-label="Close"
              onClick={onClose}
            >
              <CloseIcon />
            </IconButton>
          )}
        </Flex>

        <Flex direction="column" gap="6px">
          <Flex
            role="group"
            aria-label="File dropzone"
            data-dragging={dragging ? 'true' : 'false'}
            data-uploading={isUploading ? 'true' : 'false'}
            direction="column"
            align="center"
            justify="center"
            gap="var(--space-4)"
            h={isUpload ? '367px' : '200px'}
            px="var(--space-3)"
            py="var(--space-2)"
            borderWidth="2px"
            borderStyle="dashed"
            borderColor="var(--color-border-default)"
            borderRadius="var(--radius-xs)"
            bg="var(--color-bg-card)"
            css={{
              '&[data-dragging="true"], &[data-uploading="true"]': BLUE_STATE,
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              if (isUploading) return;
              dragDepth.current += 1;
              setDragging(true);
            }}
            onDragOver={(e) => {
              // Without this the browser never fires `drop`.
              e.preventDefault();
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              if (isUploading) return;
              dragDepth.current -= 1;
              if (dragDepth.current <= 0) endDrag();
            }}
            onDrop={(e) => {
              // Always prevent the default, or the browser opens the file.
              e.preventDefault();
              endDrag();
              if (isUploading) return;
              selectFiles(e.dataTransfer?.files);
            }}
          >
            <Box
              className="upload-file-icon"
              display="flex"
              flexShrink={0}
              color="var(--deep-blue-600)"
            >
              <UploadCircleIcon />
            </Box>
            <Text
              color="var(--color-text)"
              textAlign="center"
              {...(isUpload ? BODY_MD : BODY_SM)}
            >
              Drag and drop file here or{' '}
              <chakra.button
                type="button"
                disabled={isUploading}
                p={0}
                bg="none"
                color="inherit"
                font="inherit"
                fontWeight="var(--font-weight-bold)"
                textDecoration="underline"
                cursor={isUploading ? 'not-allowed' : 'pointer'}
                onClick={() => inputRef.current?.click()}
              >
                Choose file
              </chakra.button>
            </Text>
            <input
              ref={inputRef}
              type="file"
              hidden
              tabIndex={-1}
              accept={accept.join(',')}
              data-testid="upload-file-input"
              onChange={(e) => selectFiles(e.target.files)}
            />
          </Flex>

          <Flex
            align="center"
            justify="space-between"
            color="var(--color-text-muted)"
            {...BODY_SM}
          >
            <span>Supported format: {accept.join(', ')}</span>
            <span>Maximum size: {formatFileSize(maxSizeBytes)}</span>
          </Flex>
        </Flex>
      </Flex>

      <Flex direction="column" gap="var(--space-5)">
        {file && (
          <FileItem file={file} progress={progress} onRemove={removeFile} />
        )}
        <Flex align="center" justify="flex-end" gap="var(--space-3)">
          {isUpload && (
            <Button {...secondaryButtonProps} onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            {...primaryButtonProps}
            disabled={!file || isUploading}
            onClick={() => file && onSubmit(file)}
          >
            Submit
          </Button>
        </Flex>
      </Flex>
    </Flex>
  );
};

export default UploadFile;
