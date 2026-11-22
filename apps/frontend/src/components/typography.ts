// Text styles from the Figma type system, expressed with the CSS variables in
// styles/tokens.css. Spread into Chakra text props.

export const bodyMedium = {
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--font-size-body-md)',
  fontWeight: 'var(--font-weight-regular)',
  lineHeight: 'var(--line-height)',
} as const;

export const bodySmall = {
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--font-size-body-sm)',
  fontWeight: 'var(--font-weight-regular)',
  lineHeight: 'var(--line-height)',
} as const;
