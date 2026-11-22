import { Badge } from '@chakra-ui/react';

export type TagTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export type TagVariant =
  | 'submitted'
  | 'flagged'
  | 'missing'
  | 'pending'
  | 'healthy'
  | 'degraded'
  | 'down'
  | 'current'
  | 'corrected';

/** Preset label + tone per variant. Adding a status is a one-line change. */
export const TAG_VARIANTS: Record<
  TagVariant,
  { label: string; tone: TagTone }
> = {
  submitted: { label: 'Submitted', tone: 'success' },
  flagged: { label: 'Flagged', tone: 'warning' },
  missing: { label: 'Missing', tone: 'danger' },
  pending: { label: 'Pending', tone: 'info' },
  healthy: { label: 'Healthy', tone: 'success' },
  degraded: { label: 'Degraded', tone: 'warning' },
  down: { label: 'Down', tone: 'danger' },
  current: { label: 'Current version', tone: 'success' },
  // Assumption: tone not in Figma, confirm with designer.
  corrected: { label: 'Corrected', tone: 'info' },
};

const TONE_STYLES: Record<TagTone, { color: string; bg: string }> = {
  success: { color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  warning: { color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
  danger: { color: 'var(--color-danger)', bg: 'var(--color-danger-bg)' },
  info: { color: 'var(--color-info)', bg: 'var(--color-info-bg)' },
  // No Figma design yet; placeholder.
  neutral: {
    color: 'var(--color-text-muted)',
    bg: 'var(--color-bg-card-header)',
  },
};

export interface TagProps {
  /** Preset label + tone. */
  variant?: TagVariant;
  /** Overrides the variant's tone, or is used alone with `children`. */
  tone?: TagTone;
  /** Renders "Label (3)". 0 renders "(0)"; undefined renders nothing. */
  count?: number;
  /** Custom label, overrides the variant's label. */
  children?: React.ReactNode;
  className?: string;
}

export const Tag: React.FC<TagProps> = ({
  variant,
  tone,
  count,
  children,
  className,
}) => {
  const preset = variant ? TAG_VARIANTS[variant] : undefined;
  const label = children ?? preset?.label;
  const resolvedTone = tone ?? preset?.tone ?? 'neutral';
  const { color, bg } = TONE_STYLES[resolvedTone];

  return (
    <Badge
      className={className}
      data-tone={resolvedTone}
      data-variant={variant}
      minH="16px"
      px="10px"
      py="2px"
      border="1px solid"
      borderColor={color}
      borderRadius="var(--radius-pill)"
      bg={bg}
      color={color}
      fontFamily="var(--font-body)"
      fontSize="14px"
      fontWeight="var(--font-weight-bold)"
      lineHeight="var(--line-height)"
      whiteSpace="nowrap"
    >
      {label}
      {count !== undefined && ` (${count})`}
    </Badge>
  );
};

export default Tag;
