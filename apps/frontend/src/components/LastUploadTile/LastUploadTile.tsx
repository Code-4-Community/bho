import { Tile } from '../Tile';

export interface LastUploadTileProps {
  /** Pre-formatted, e.g. "13:59:59". null / undefined render "—". */
  time: string | null | undefined;
  /** Rendered as "uploaded by: <name>". Omitted when empty. */
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
    caption={uploadedBy ? `uploaded by: ${uploadedBy}` : undefined}
    className={['tile--wide', className].filter(Boolean).join(' ')}
  />
);

export default LastUploadTile;
