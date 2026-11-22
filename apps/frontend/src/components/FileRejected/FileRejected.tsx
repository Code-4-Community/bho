import { Box, Flex, Heading, IconButton, List, Text } from '@chakra-ui/react';
import { CloseIcon, WarningIcon } from '../icons';
import { BODY_MD, H3, closeButtonProps } from '../styles';
import type { FileRejection } from '../UploadFile/types';

export interface FileRejectedProps {
  title?: string;
  rejections: FileRejection[];
  /** Shows the × when provided. */
  onClose?: () => void;
}

/**
 * Lists what was rejected and why. Generic on purpose: it shows client-side
 * file checks and also parse/validation errors from the backend.
 */
export const FileRejected: React.FC<FileRejectedProps> = ({
  title = 'File Rejected',
  rejections,
  onClose,
}) => {
  if (rejections.length === 0) return null;

  return (
    <Flex
      role="alert"
      direction="column"
      gap="18px"
      w="100%"
      maxW="668px"
      p="var(--space-6) 17px var(--space-8)"
      borderRadius="var(--radius-md)"
      bg="var(--color-bg-card)"
    >
      <Flex align="flex-start" justify="space-between" minH="35px">
        <Heading as="h3" color="var(--color-text)" {...H3}>
          {title}
        </Heading>
        {onClose && (
          <IconButton
            {...closeButtonProps}
            aria-label="Close"
            onClick={onClose}
          >
            <CloseIcon />
          </IconButton>
        )}
      </Flex>
      <List.Root
        listStyleType="none"
        m={0}
        p={0}
        display="flex"
        flexDirection="column"
        gap="18px"
      >
        {rejections.map(({ item, reason }, index) => (
          <List.Item
            key={`${item}-${index}`}
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            gap="var(--space-3)"
            // Figma draws the row text in plain black; mapped to the text token.
            color="var(--color-text)"
            {...BODY_MD}
          >
            <Flex align="center" gap="var(--space-3)" minW={0}>
              <Box flexShrink={0} display="flex">
                <WarningIcon />
              </Box>
              <Text as="span" overflowWrap="anywhere">
                {item}
              </Text>
            </Flex>
            <Text as="em" fontStyle="italic" textAlign="right">
              {reason}
            </Text>
          </List.Item>
        ))}
      </List.Root>
    </Flex>
  );
};

export default FileRejected;
