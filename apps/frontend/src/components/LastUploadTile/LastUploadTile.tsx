import { Tile } from '../Tile';

export interface LastUploadTileProps {
  /** Pre-formatted, e.g. "13:59:59". null / undefined render "—". */
  time: string | null | undefined;
  /** Rendered as "Uploaded by: <name>". Omitted when empty. */
  uploadedBy?: string | null;
  className?: string;
}

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
