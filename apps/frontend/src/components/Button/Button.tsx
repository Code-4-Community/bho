import {
  Button as ChakraButton,
  type ButtonProps as ChakraButtonProps,
} from '@chakra-ui/react';
import type { ReactNode } from 'react';
import {
  BUTTON_SIZES,
  BUTTON_VARIANTS,
  type ButtonSize,
  type ButtonVariant,
} from './variants';

type BaseProps = Omit<
  ChakraButtonProps,
  'variant' | 'size' | 'loading' | 'loadingText' | 'children'
> & {
  /** Look of the button. Label and icons are passed by the caller. */
  variant?: ButtonVariant;
  /** `md` is Figma's 40px. `sm` is a compact option (not in Figma). */
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  /** Shows a spinner, disables the button and keeps its width. */
  loading?: boolean;
  loadingText?: ReactNode;
  /** Renders a real `<a>` styled as the button (use for navigation). */
  href?: string;
  target?: string;
  rel?: string;
};

// With no children the button is icon-only and needs an accessible name.
export type ButtonProps = BaseProps &
  ({ children: ReactNode } | { children?: undefined; 'aria-label': string });

const Icon = ({ children }: { children: ReactNode }) => (
  <span
    aria-hidden="true"
    style={{ display: 'inline-flex', flexShrink: 0, alignItems: 'center' }}
  >
    {children}
  </span>
);

/**
 * Shared button. Built on Chakra's `Button` and styled with the tokens in
 * `styles/tokens.css` to match the Figma "Buttons" frame (156:1559).
 *
 * - `variant` is the look (`primary`, `secondary`, `dark`, `link`, `ghost`).
 *   The caller passes the label and icons, so there is no variant per label.
 * - `size` is `md` (Figma's 40px) or `sm` (compact, not in Figma).
 * - `loading` shows a spinner, disables the button and sets `aria-busy`;
 *   `loadingText` replaces the label while loading.
 * - `href` renders a real `<a>`. `asChild` wraps your own element (e.g. a
 *   router Link) and leaves its content and `type` alone.
 * - `type` defaults to `"button"` so a button in a form never submits by
 *   accident. Pass `type="submit"` for Submit.
 * - With no children it is icon-only and `aria-label` is required.
 *
 * Other Chakra props (`onClick`, `disabled`, `aria-*`, ...) pass through.
 *
 * @example
 * <Button leftIcon={<Upload size={20} />} onClick={upload}>Upload</Button>
 * <Button variant="secondary" onClick={close}>Cancel</Button>
 * <Button variant="ghost" aria-label="Open entry" leftIcon={<ChevronRight size={26} />} />
 */
export function Button({
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  loading = false,
  loadingText,
  href,
  target,
  rel,
  type,
  asChild,
  children,
  ...rest
}: ButtonProps) {
  const styles = { ...BUTTON_VARIANTS[variant], ...BUTTON_SIZES[size] };
  // `link` and `ghost` own their height, whatever the size.
  if (variant === 'link') styles.h = 'auto';
  if (variant === 'ghost') styles.h = BUTTON_VARIANTS.ghost.h;

  const common = {
    ...styles,
    'data-variant': variant,
    'data-size': size,
    ...rest,
  };

  const content = (
    <>
      {leftIcon ? <Icon>{leftIcon}</Icon> : null}
      {children}
      {rightIcon ? <Icon>{rightIcon}</Icon> : null}
    </>
  );

  if (href) {
    return (
      <ChakraButton
        asChild
        {...common}
        type={undefined}
        aria-busy={loading || undefined}
      >
        <a
          href={href}
          target={target}
          rel={rel ?? (target === '_blank' ? 'noopener noreferrer' : undefined)}
        >
          {content}
        </a>
      </ChakraButton>
    );
  }

  if (asChild) {
    // The caller supplies the element (e.g. a router Link), so don't add
    // `type` or wrap its content.
    return (
      <ChakraButton asChild {...common} type={undefined}>
        {children}
      </ChakraButton>
    );
  }

  return (
    <ChakraButton
      {...common}
      type={type ?? 'button'}
      loading={loading}
      loadingText={loadingText}
      aria-busy={loading || undefined}
    >
      {content}
    </ChakraButton>
  );
}
