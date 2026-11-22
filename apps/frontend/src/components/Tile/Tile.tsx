import { Box, Flex, Text, VisuallyHidden } from '@chakra-ui/react';
import { CircleAlert, CircleCheck, CircleMinus } from 'lucide-react';
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

// Assumption: info and success use a minus and a check circle to match the
// warning circle in Figma. Confirm with designer.
const TONE_ICONS: Record<
  Exclude<TileTone, 'neutral'>,
  { Icon: typeof CircleAlert; color: string; text: string }
> = {
  warning: {
    Icon: CircleAlert,
    color: 'var(--color-warning)',
    text: 'warning',
  },
  info: { Icon: CircleMinus, color: 'var(--color-info)', text: 'info' },
  success: { Icon: CircleCheck, color: 'var(--color-success)', text: 'ok' },
};

/**
 * Tile
 *
 * White summary card for a single dashboard figure: a label at the top, a
 * large value, and an optional caption.
 *
 * A non-neutral `tone` adds a status icon in the top-right corner, plus
 * visually hidden "Status: …" text so the meaning is not conveyed by the icon
 * alone. A `null` or `undefined` value renders an em dash with an accessible
 * "No data" label; `0` is a real value and renders "0".
 *
 * Label, value and caption are direct children of a column flex container. With
 * a caption the value sits midway between label and caption; without one it
 * sits bottom-left. Use `wide` to span two columns of a grid. For the last
 * upload figure, use `LastUploadTile` instead of composing this by hand.
 *
 * @example
 * <Tile label="Rejected Values" value={6} tone="warning" />
 * <Tile label="Station Pressure" value={null} />
 */
export const Tile: React.FC<TileProps> = ({
  label,
  value,
  caption,
  tone = 'neutral',
  wide = false,
  valueColor = 'var(--color-text)',
  className,
}) => {
  const toneIcon = tone === 'neutral' ? undefined : TONE_ICONS[tone];

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
      {toneIcon && (
        <>
          <Box position="absolute" top="9px" right="9px" display="flex">
            <toneIcon.Icon
              size={18}
              color={toneIcon.color}
              aria-hidden="true"
            />
          </Box>
          <VisuallyHidden>Status: {toneIcon.text}</VisuallyHidden>
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
