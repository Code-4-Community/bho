import type { ButtonProps, TextProps } from '@chakra-ui/react';

// Shared Chakra style props for the upload components. Every value is a CSS
// variable from styles/tokens.css (#68), so there is no second theme.

export const H2 = {
  fontFamily: 'var(--font-heading)',
  fontSize: 'var(--font-size-h2)',
  fontWeight: 'var(--font-weight-bold)',
  lineHeight: 'var(--line-height)',
} satisfies TextProps;

export const H3 = {
  ...H2,
  fontSize: 'var(--font-size-h3)',
} satisfies TextProps;

/** Figma "Body Medium", 18px. */
export const BODY_MD = {
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--font-size-body-md)',
  fontWeight: 'var(--font-weight-regular)',
  lineHeight: 'var(--line-height)',
} satisfies TextProps;

/** Figma "Body Small", 16px. */
export const BODY_SM = {
  ...BODY_MD,
  fontSize: 'var(--font-size-body-sm)',
} satisfies TextProps;

// TODO(#94): replace these with the shared Button once it merges. Until then
// they dress Chakra's own Button to match the Figma Buttons frame (156:1559).
// Figma uses Inter for the label, which isn't loaded; this uses Arial.
const buttonBase = {
  h: '40px',
  minW: '40px',
  px: 'var(--space-4)',
  py: '2px',
  gap: 'var(--space-2)',
  borderRadius: 'var(--radius-xxs)',
  fontFamily: 'var(--font-body)',
  fontSize: '0.875rem',
  fontWeight: 500,
  lineHeight: '20px',
} satisfies ButtonProps;

export const primaryButtonProps = {
  ...buttonBase,
  bg: 'var(--color-primary)',
  color: 'var(--color-text-inverse)',
  borderWidth: '1px',
  borderColor: 'var(--color-primary)',
  _hover: {
    bg: 'var(--color-primary-hover)',
    borderColor: 'var(--color-primary-hover)',
  },
  // Assumption (handoff open question 1): lighter green + not-allowed when disabled.
  _disabled: {
    opacity: 1,
    bg: 'var(--color-primary-hover)',
    borderColor: 'var(--color-primary-hover)',
    cursor: 'not-allowed',
  },
} satisfies ButtonProps;

export const secondaryButtonProps = {
  ...buttonBase,
  bg: 'var(--color-bg-card)',
  color: 'var(--color-text)',
  borderWidth: '1.5px',
  borderColor: 'var(--color-border)',
  _hover: { bg: 'var(--deep-blue-50)' },
  _disabled: {
    opacity: 1,
    color: 'var(--color-text-muted)',
    cursor: 'not-allowed',
  },
} satisfies ButtonProps;

/** The 28 x 22 borderless × button used in the headers and file row. */
export const closeButtonProps = {
  variant: 'plain',
  w: '28px',
  h: '22px',
  minW: 0,
  p: 0,
  color: 'var(--color-text)',
} satisfies ButtonProps;
