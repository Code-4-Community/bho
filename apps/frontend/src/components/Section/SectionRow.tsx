import {
  Box,
  Flex,
  Image,
  Link,
  LinkBox,
  LinkOverlay,
  chakra,
} from '@chakra-ui/react';
import chevronIcon from '../../assets/icons/chevron.svg';
import { bodyMedium } from '../typography';

export interface SectionRowProps {
  /** See DateTimeHeading. */
  heading: React.ReactNode;
  label?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** When set, the subtitle renders as an italic underlined link. */
  subtitleHref?: string;
  leadingIcon?: React.ReactNode;
  tag?: React.ReactNode;
  trailing?: 'chevron' | 'none';
  /** Makes the whole row a link. */
  href?: string;
  /** Makes the whole row a button. */
  onClick?: () => void;
  highlighted?: boolean;
}

// The overlay's ::before stretches over the whole row, so it carries the
// focus ring too.
const overlayFocus = {
  outline: 'none',
  '&::before': {
    outline: '2px solid var(--color-info)',
    outlineOffset: '-2px',
  },
} as const;

const textColumn = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: '8px',
  textAlign: 'left',
} as const;

export const SectionRow: React.FC<SectionRowProps> = ({
  heading,
  label,
  subtitle,
  subtitleHref,
  leadingIcon,
  tag,
  trailing = 'none',
  href,
  onClick,
  highlighted = false,
}) => {
  const interactive = Boolean(href || onClick);
  const subtitleIsLink = Boolean(subtitleHref && subtitle);

  const main = (
    <>
      <Box {...bodyMedium} fontWeight="var(--font-weight-bold)" fontSize="20px">
        {heading}
      </Box>
      {label && (
        <Box {...bodyMedium} fontWeight="var(--font-weight-bold)">
          {label}
        </Box>
      )}
      {subtitle && !subtitleIsLink && (
        <Box {...bodyMedium} color="var(--color-text-muted)">
          {subtitle}
        </Box>
      )}
    </>
  );

  // A <button> or <a> cannot contain another link, so the row's own element
  // wraps only the text, and LinkOverlay's ::before stretches it over the whole
  // row. LinkBox lifts the subtitle link above that overlay, so it stays
  // clickable and never triggers the row's action.
  let mainElement: React.ReactNode;
  if (href) {
    mainElement = (
      <LinkOverlay
        href={href}
        {...textColumn}
        color="inherit"
        textDecoration="none"
        _focusVisible={overlayFocus}
      >
        {main}
      </LinkOverlay>
    );
  } else if (onClick) {
    mainElement = (
      <LinkOverlay asChild>
        <chakra.button
          type="button"
          onClick={onClick}
          {...textColumn}
          p="0"
          border="0"
          bg="none"
          color="inherit"
          cursor="pointer"
          _focusVisible={overlayFocus}
        >
          {main}
        </chakra.button>
      </LinkOverlay>
    );
  } else {
    mainElement = <Box {...textColumn}>{main}</Box>;
  }

  return (
    <LinkBox
      as="li"
      display="flex"
      alignItems="center"
      gap="12px"
      py="16px"
      pr="16px"
      pl={leadingIcon ? '8px' : '16px'}
      borderBottom="1px solid"
      borderColor="var(--color-border)"
      bg={highlighted ? 'var(--blue-50)' : 'var(--color-bg-card)'}
      _last={{ borderBottom: '0' }}
      _hover={
        interactive && !highlighted ? { bg: 'var(--deep-blue-50)' } : undefined
      }
      data-interactive={interactive}
      data-highlighted={highlighted}
    >
      <Flex flex="1" minW="0" align="center" gap="8px">
        {leadingIcon && (
          <Box flex="none" display="flex" aria-hidden="true">
            {leadingIcon}
          </Box>
        )}
        <Flex direction="column" align="flex-start" gap="8px" minW="0">
          {mainElement}
          {subtitleIsLink && (
            // TODO(#94): use shared link/button styles once they land.
            <Link
              href={subtitleHref}
              {...bodyMedium}
              fontStyle="italic"
              textDecoration="underline"
              color="var(--color-text-muted)"
            >
              {subtitle}
            </Link>
          )}
        </Flex>
      </Flex>
      {tag && <Box flex="none">{tag}</Box>}
      {trailing === 'chevron' && (
        <Flex flex="none" h="32px" align="center" pl="6px" pr="4px">
          <Image src={chevronIcon} alt="" aria-hidden="true" />
        </Flex>
      )}
    </LinkBox>
  );
};

export default SectionRow;
