import { Children, useId } from 'react';
import {
  Box,
  Flex,
  Heading,
  Skeleton,
  Text,
  VisuallyHidden,
  chakra,
} from '@chakra-ui/react';
import { bodyMedium, bodySmall } from '../typography';

export interface SectionProps {
  title: string;
  headingLevel?: 2 | 3 | 4;
  /** Text, or a link/button the caller passes in. */
  headerAction?: React.ReactNode;
  isLoading?: boolean;
  /** Shown when there are no rows and not loading. */
  emptyMessage?: React.ReactNode;
  /** Enables body scrolling. */
  maxHeight?: number | string;
  /** SectionRow elements, rendered in the order given. */
  children?: React.ReactNode;
  className?: string;
}

const SKELETON_ROWS = 3;

export const Section: React.FC<SectionProps> = ({
  title,
  headingLevel = 2,
  headerAction,
  isLoading = false,
  emptyMessage = 'Nothing to show yet.',
  maxHeight,
  children,
  className,
}) => {
  const titleId = useId();
  const headingTag = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  const isEmpty = Children.toArray(children).length === 0;
  const scrolls = maxHeight !== undefined;

  return (
    <Box
      as="section"
      className={className}
      aria-labelledby={titleId}
      overflow="hidden"
      border="1px solid"
      borderColor="var(--color-border)"
      borderRadius="var(--radius-md)"
      bg="var(--color-bg-card)"
      color="var(--color-text)"
    >
      <Flex
        as="header"
        align="center"
        justify="space-between"
        gap="16px"
        pt="20px"
        pr="16px"
        pb="16px"
        pl="16px"
        bg="var(--color-bg-card-header)"
        borderBottom="1.5px solid"
        borderColor="var(--color-border)"
      >
        <Heading
          as={headingTag}
          id={titleId}
          m="0"
          fontFamily="var(--font-heading)"
          fontSize="var(--font-size-h3)"
          fontWeight="var(--font-weight-bold)"
          lineHeight="var(--line-height)"
        >
          {title}
        </Heading>
        {headerAction && (
          <Box
            {...bodySmall}
            // TODO(#94): use shared Button/Link for action links and buttons.
            css={{
              '& a, & button': {
                padding: 0,
                border: 0,
                background: 'none',
                color: 'inherit',
                font: 'inherit',
                fontWeight: 'var(--font-weight-bold)',
                textDecoration: 'underline',
                cursor: 'pointer',
              },
            }}
          >
            {headerAction}
          </Box>
        )}
      </Flex>
      {!isLoading && isEmpty ? (
        <Text
          {...bodyMedium}
          py="32px"
          px="20px"
          textAlign="center"
          color="var(--color-text-muted)"
        >
          {emptyMessage}
        </Text>
      ) : (
        <chakra.ul
          role="list"
          aria-busy={isLoading}
          m="0"
          p="0"
          listStyle="none"
          maxHeight={
            typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight
          }
          overflowY={scrolls ? 'auto' : undefined}
        >
          {isLoading ? (
            <>
              <VisuallyHidden as="li">Loading…</VisuallyHidden>
              {Array.from({ length: SKELETON_ROWS }, (_, i) => (
                <chakra.li
                  key={i}
                  aria-hidden="true"
                  data-testid="section-skeleton"
                  p="16px"
                  borderBottom="1px solid"
                  borderColor="var(--color-border)"
                >
                  <Skeleton h="88px" />
                </chakra.li>
              ))}
            </>
          ) : (
            children
          )}
        </chakra.ul>
      )}
    </Box>
  );
};

export default Section;
