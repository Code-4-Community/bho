import './Tile.css';

export type TileTone = 'neutral' | 'warning' | 'info' | 'success';

export interface TileProps {
  label: string;
  /** null / undefined render "—". 0 is a real value and renders "0". */
  value: React.ReactNode | null;
  caption?: React.ReactNode;
  tone?: TileTone;
  className?: string;
}

const TONE_TEXT: Record<Exclude<TileTone, 'neutral'>, string> = {
  warning: 'warning',
  info: 'info',
  success: 'ok',
};

// Assumption: info and success icons are taken from the circle-alert set in
// Figma (Null / Ok). Confirm with designer.
const ToneIcon: React.FC<{ tone: Exclude<TileTone, 'neutral'> }> = ({
  tone,
}) => (
  <svg
    className="tile__icon"
    width="18"
    height="18"
    viewBox="0 0 18 18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="9" cy="9" r="8" />
    {tone === 'warning' && <path d="M9 5v5M9 12.5v.01" />}
    {tone === 'info' && <path d="M5.5 9h7" />}
    {tone === 'success' && <path d="M5.5 9.5l2.5 2.5 4.5-5" />}
  </svg>
);

export const Tile: React.FC<TileProps> = ({
  label,
  value,
  caption,
  tone = 'neutral',
  className,
}) => (
  <div
    className={['tile', className].filter(Boolean).join(' ')}
    data-tone={tone}
  >
    <div className="tile__label">{label}</div>
    {tone !== 'neutral' && (
      <>
        <ToneIcon tone={tone} />
        <span className="tile__sr">Status: {TONE_TEXT[tone]}</span>
      </>
    )}
    <div className="tile__value">
      {value === null || value === undefined ? (
        <span role="img" aria-label="No data">
          —
        </span>
      ) : (
        value
      )}
    </div>
    {caption && <div className="tile__caption">{caption}</div>}
  </div>
);

export default Tile;
