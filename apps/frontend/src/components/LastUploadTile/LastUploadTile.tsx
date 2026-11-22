import { Tile } from '../Tile';

export interface LastUploadTileProps {
  /** Pre-formatted, e.g. "13:59:59". null / undefined render "—". */
  time: string | null | undefined;
  /** Rendered as "Uploaded by: <name>". Omitted when empty. */
  uploadedBy?: string | null;
  className?: string;
}

/**
 * LastUploadTile
 *
 * The "Last Upload Time" tile: a thin wrapper around `Tile` that owns the
 * label, the "Uploaded by: <name>" caption format, and the two-column wide
 * layout, so callers pass only data.
 *
 * `time` is a pre-formatted string; `null` or `undefined` renders the dash
 * from `Tile`. `uploadedBy` is optional and the caption is omitted when it is
 * missing or empty. The value is black to match Figma, where every other tile
 * value uses `--color-text`.
 *
 * @example
 * <LastUploadTile time="13:59:59" uploadedBy="John Doe" />
 */
export const LastUploadTile: React.FC<LastUploadTileProps> = ({
  time,
  uploadedBy,
  className,
}) => (
  <Tile
    label="Last Upload Time"
    value={time}
    caption={uploadedBy ? `Uploaded by: ${uploadedBy}` : undefined}
    wide
    // Figma colors this value #000; every other tile value is --color-text.
    valueColor="#000000"
    className={className}
  />
);

export default LastUploadTile;
