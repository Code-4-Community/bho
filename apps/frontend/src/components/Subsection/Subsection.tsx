import { Box, Flex } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { BODY_MD } from '../styles';

export interface SubsectionProps {
  /** Leading icon. */
  icon?: ReactNode;
  /**
   * 'side' puts the icon beside the whole text block (the file row);
   * 'inline' puts it on the title line only (the "Table Example" variant).
   */
  iconPlacement?: 'side' | 'inline';
  /** Bold heading line. */
  title: ReactNode;
  /** Muted text under the title. */
  description?: ReactNode;
  /** Right-hand action, e.g. a Download button or a close icon button. */
  action?: ReactNode;
  /** Extra content under the header row (e.g. a progress bar). */
  children?: ReactNode;
  /** The file-row layout: no gap between title and description, action at the top. */
  dense?: boolean;
  className?: string;
}

/**
 * Subsection
 *
 * A layout shell for the grey rounded panels in Figma (Example, Uploading and
 * DailyDiscussion). It lays out an optional icon, a title with an optional
 * description, an optional action on the right (vertically centered), and any
 * children underneath. It has no click behavior or state of its own.
 *
 * - `iconPlacement="side"` (default) puts the icon beside the whole text block;
 *   `"inline"` puts it on the title line only ("Table Example").
 * - `dense` is the file-row layout: no gap between title and description, and
 *   the action aligned to the top. `FileItem` uses it.
 *
 * @example
 * <Subsection
 *   icon={<CsvFileIcon />}
 *   iconPlacement="inline"
 *   title="Table Example"
 *   description="Download the example and use it as a starting point."
 *   action={<Button>Download</Button>}
 * />
 */
export const Subsection: React.FC<SubsectionProps> = ({
  icon,
  iconPlacement = 'side',
  title,
  description,
  action,
  children,
  dense = false,
  className,
}) => (
  <Flex
    className={className}
    direction="column"
    gap="var(--space-3)"
    p="var(--space-4)"
    borderRadius="var(--radius-md)"
    bg="var(--deep-blue-50)"
  >
    <Flex align={dense ? 'flex-start' : 'center'} gap="var(--space-3)">
      {icon && iconPlacement === 'side' && (
        <Flex align="center" flexShrink={0}>
          {icon}
        </Flex>
      )}
      <Flex
        direction="column"
        flex="1"
        minW={0}
        gap={dense ? 0 : 'var(--space-3)'}
      >
        <Flex
          align="center"
          gap="var(--space-3)"
          color="var(--color-text)"
          {...BODY_MD}
          fontWeight="var(--font-weight-bold)"
          overflowWrap="anywhere"
        >
          {icon && iconPlacement === 'inline' && (
            <Flex align="center" flexShrink={0}>
              {icon}
            </Flex>
          )}
          {title}
        </Flex>
        {description && (
          <Box color="var(--color-text-muted)" {...BODY_MD}>
            {description}
          </Box>
        )}
      </Flex>
      {action && (
        <Flex align="center" flexShrink={0}>
          {action}
        </Flex>
      )}
    </Flex>
    {children}
  </Flex>
);

export default Subsection;
