import { Box, Flex, IconButton, Progress, Text } from '@chakra-ui/react';
import { formatFileSize } from '../../utils/formatFileSize';
import { CloseIcon, CsvFileIcon } from '../icons';
import { Subsection } from '../Subsection';
import { BODY_MD, BODY_SM, closeButtonProps } from '../styles';

export interface FileItemProps {
  /** A `File` works here too. */
  file: { name: string; size: number };
  /** 0-100. Omit to hide the progress bar. */
  progress?: number;
  /** Shows the × button when provided. */
  onRemove?: () => void;
}

const clampPercent = (value: number) =>
  Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 0;

/** The selected-file row (Figma Subsection "Uploading"). */
export const FileItem: React.FC<FileItemProps> = ({
  file,
  progress,
  onRemove,
}) => {
  const percent = progress === undefined ? undefined : clampPercent(progress);

  return (
    <Subsection
      dense
      icon={
        <Box
          p="7.62px"
          borderRadius="var(--radius-xs)"
          bg="var(--color-bg-card)"
          // Figma draws the CSV glyph in black; nearest token.
          color="var(--deep-blue-800)"
        >
          <CsvFileIcon width="25.09px" height="26.26px" display="block" />
        </Box>
      }
      title={file.name}
      description={
        <Text color="var(--color-text-muted)" {...BODY_SM}>
          {formatFileSize(file.size)}
        </Text>
      }
      action={
        onRemove && (
          <IconButton
            {...closeButtonProps}
            aria-label={`Remove ${file.name}`}
            onClick={onRemove}
          >
            <CloseIcon />
          </IconButton>
        )
      }
    >
      {percent !== undefined && (
        <Flex align="center" gap="18px">
          <Progress.Root
            flex="1"
            value={percent}
            min={0}
            max={100}
            aria-label={`Upload progress for ${file.name}`}
          >
            <Progress.Track
              h="9px"
              borderRadius="10px"
              // Figma uses plain #D9D9D9 here; nearest token.
              bg="var(--color-border)"
            >
              <Progress.Range bg="var(--color-primary)" borderRadius="10px" />
            </Progress.Track>
          </Progress.Root>
          <Text color="var(--color-text)" whiteSpace="nowrap" {...BODY_MD}>
            {percent}%
          </Text>
        </Flex>
      )}
    </Subsection>
  );
};

export default FileItem;
