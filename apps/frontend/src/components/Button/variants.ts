import type { ButtonProps as ChakraButtonProps } from '@chakra-ui/react';

export type ButtonVariant = 'primary' | 'secondary' | 'dark' | 'link' | 'ghost';
export type ButtonSize = 'sm' | 'md';

// Values with no token in #68's tokens.css yet. They are named here and listed
// in the PR instead of being scattered through the styles. Where #76 already
// adds a token (`--radius-xxs`, `--color-primary-hover`) we read it and fall
// back to the Figma value so this works before and after that merges.
const RADIUS = 'var(--radius-xxs, 4px)'; // Figma radii/l2
const PRIMARY_HOVER = 'var(--color-primary-hover, var(--sea-green-400))'; // Figma "Clicked"
const FOCUS_RING = 'var(--sea-green-600)'; // no Figma design, assumption
const HEIGHT_MD = '40px'; // Figma Size/10
const HEIGHT_SM = '32px'; // assumption, not in Figma

type StyleProps = Partial<ChakraButtonProps>;

const base = {
  gap: 'var(--space-2)',
  px: 'var(--space-4)',
  py: '2px',
  minW: '40px',
  borderRadius: RADIUS,
  borderWidth: '1px',
  borderStyle: 'solid',
  // Figma uses Inter 14/500; Inter isn't loaded in the app (flagged in PR),
  // so this uses the body font.
  fontFamily: 'var(--font-body)',
  fontSize: '0.875rem',
  fontWeight: 500,
  lineHeight: '20px',
  textDecoration: 'none',
  cursor: 'pointer',
  transition: 'background-color 120ms, border-color 120ms, color 120ms',
  _focusVisible: {
    outline: `2px solid ${FOCUS_RING}`,
    outlineOffset: '2px',
  },
  _disabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
} satisfies StyleProps;

/** Style per variant. Callers pass the label and icons, so there is one
 * variant per look, not one per label (Submit, Cancel, Download, ...). */
export const BUTTON_VARIANTS: Record<ButtonVariant, StyleProps> = {
  // Upload, Re-Upload, Refresh, Download, Submit, Add Text, Source: All
  primary: {
    ...base,
    bg: 'var(--color-primary)',
    borderColor: 'var(--color-primary)',
    color: 'var(--color-text-inverse)',
    _hover: { bg: PRIMARY_HOVER, borderColor: PRIMARY_HOVER },
    // Pressed state is an assumption (--sea-green-600 is in the variables
    // but not in the frames).
    _active: {
      bg: 'var(--sea-green-600)',
      borderColor: 'var(--sea-green-600)',
    },
  },
  // Cancel, Close. Figma's border is 1.5px.
  secondary: {
    ...base,
    bg: 'var(--color-bg-card)',
    borderWidth: '1.5px',
    borderColor: 'var(--color-border)',
    color: 'var(--color-text)',
    _hover: { bg: 'var(--deep-blue-50)' },
    _active: { bg: 'var(--deep-blue-100)' },
  },
  // Clear Filters
  dark: {
    ...base,
    bg: 'var(--deep-blue-400)',
    borderColor: 'var(--deep-blue-400)',
    color: 'var(--color-text-inverse)',
    _hover: {
      bg: 'var(--deep-blue-300)',
      borderColor: 'var(--deep-blue-300)',
    },
    _active: {
      bg: 'var(--deep-blue-500)',
      borderColor: 'var(--deep-blue-500)',
    },
  },
  // Today's Entry: Arial bold 14/24 underlined text, green when "Clicked".
  link: {
    ...base,
    h: 'auto',
    minW: 0,
    p: 0,
    borderWidth: 0,
    borderRadius: '2px',
    bg: 'transparent',
    color: 'var(--color-text)',
    fontWeight: 700,
    lineHeight: '24px',
    textDecoration: 'underline',
    _hover: { color: 'var(--sea-green-600)', bg: 'transparent' },
    _active: { color: 'var(--sea-green-600)', bg: 'transparent' },
  },
  // Open: green chevron only, no background.
  ghost: {
    ...base,
    h: '32px',
    minW: '32px',
    px: '4px',
    py: '5px',
    borderWidth: 0,
    borderRadius: '20px',
    bg: 'transparent',
    color: 'var(--color-primary)',
    _hover: { bg: 'var(--deep-blue-50)' },
    _active: { bg: 'var(--deep-blue-100)' },
  },
};

/** Height per size. `link` and `ghost` keep their own height. */
export const BUTTON_SIZES: Record<ButtonSize, StyleProps> = {
  md: { h: HEIGHT_MD },
  sm: { h: HEIGHT_SM, px: 'var(--space-3)' },
};
