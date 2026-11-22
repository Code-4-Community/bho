import { Box, Flex, Image, Text, VisuallyHidden } from '@chakra-ui/react';
import warningIcon from '../../assets/icons/circle-alert-warning.svg';
import infoIcon from '../../assets/icons/circle-alert-null.svg';
import successIcon from '../../assets/icons/circle-alert-ok.svg';
import { bodyMedium, bodySmall } from '../typography';

export type TileTone = 'neutral' | 'warning' | 'info' | 'success';

export interface TileProps {
  label: string;
  /** null / undefined render "—". 0 is a real value and renders "0". */
  value: React.ReactNode | null;
  caption?: React.ReactNode;
  tone?: TileTone;
  /** Spans two grid columns, e.g. the Last Upload Time tile. */
  wide?: boolean;
  /** Overrides the value color (default `--color-text`). */
  valueColor?: string;
  className?: string;
}

// Assumption: info and success icons are the "Null" and "Ok" variants of the
// circle-alert set in Figma. Confirm with designer.
const TONE_ICONS: Record<
  Exclude<TileTone, 'neutral'>,
  { src: string; text: string }
> = {
  warning: { src: warningIcon, text: 'warning' },
  info: { src: infoIcon, text: 'info' },
  success: { src: successIcon, text: 'ok' },
};

export const Tile: React.FC<TileProps> = ({
  label,
  value,
  caption,
  tone = 'neutral',
  wide = false,
  valueColor = 'var(--color-text)',
  className,
}) => {
  const icon = tone === 'neutral' ? undefined : TONE_ICONS[tone];

  return (
    <Flex
      className={className}
      data-tone={tone}
      direction="column"
      // Label, value and caption are direct children, so with a caption the
      // value sits midway between them; without one it sits bottom-left.
      justify="space-between"
      position="relative"
      minH="159px"
      gridColumn={wide ? 'span 2' : undefined}
      pt="6px"
      pr="12px"
      pb="10px"
      pl="10px"
      borderRadius="var(--radius-sm)"
      bg="var(--color-bg-card)"
      color="var(--color-text)"
    >
      <Text {...bodyMedium} pr="24px">
        {label}
      </Text>
      {icon && (
        <>
          <Image
            src={icon.src}
            alt=""
            aria-hidden="true"
            position="absolute"
            top="9px"
            right="9px"
            boxSize="18px"
          />
          <VisuallyHidden>Status: {icon.text}</VisuallyHidden>
        </>
      )}
      <Box
        fontFamily="var(--font-heading)"
        fontSize="var(--font-size-tile-number)"
        fontWeight="var(--font-weight-bold)"
        // The shared token pairs 48px type with a 24px line height, which
        // lets the glyphs spill below the line box into the caption.
        lineHeight="1.1"
        color={valueColor}
      >
        {value === null || value === undefined ? (
          <span role="img" aria-label="No data">
            —
          </span>
        ) : (
          value
        )}
      </Box>
      {caption && (
        <Text {...bodySmall} fontStyle="italic">
          {caption}
        </Text>
      )}
    </Flex>
  );
};

export default Tile;
