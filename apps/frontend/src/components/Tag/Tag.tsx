import './Tag.css';

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

  return (
    <span
      className={['tag', className].filter(Boolean).join(' ')}
      data-tone={resolvedTone}
      data-variant={variant}
    >
      {label}
      {count !== undefined && ` (${count})`}
    </span>
  );
};

export default Tag;
